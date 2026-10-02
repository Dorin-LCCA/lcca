from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import uuid
import ipaddress
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx
from bson import ObjectId
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, BeforeValidator, ConfigDict

# ----------------------------------------------------------------------------
# Database
# ----------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent managed email proxy. CONSTANT (survives deployment) — never from env.
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "DORIN TRAVEL")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")


# ----------------------------------------------------------------------------
# Logging
# ----------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------------
# Mongo helpers
# ----------------------------------------------------------------------------
PyObjectId = Annotated[str, BeforeValidator(str)]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ----------------------------------------------------------------------------
# Auth (Emergent Google OAuth)
# ----------------------------------------------------------------------------
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
SESSION_TTL_DAYS = 7


def set_session_cookie(response: Response, session_token: str):
    response.set_cookie("session_token", session_token, httponly=True, secure=True,
                        samesite="none", max_age=SESSION_TTL_DAYS * 86400, path="/")


def serialize_user(user: dict) -> dict:
    return {
        "id": user["user_id"],
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "picture": user.get("picture", ""),
        "role": user.get("role", "customer"),
        "marketing_opt_in": user.get("marketing_opt_in", False),
        "preferences": user.get("preferences", {}),
        "saved_destinations": user.get("saved_destinations", []),
        "saved_offers": user.get("saved_offers", []),
        "created_at": user.get("created_at", ""),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ----------------------------------------------------------------------------
# Email (Emergent-managed Resend) — guardrail gate copied as-is
# ----------------------------------------------------------------------------
_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str) -> Optional[str]:
    _assert_safe_email(subject, html)
    if not EMAIL_KEY:
        logger.warning("EMERGENT_EMAIL_KEY not set; skipping email send")
        return None
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    try:
        async with httpx.AsyncClient(timeout=30) as hc:
            resp = await hc.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                                 headers={"X-Email-Key": EMAIL_KEY}, json=payload)
        resp.raise_for_status()
        return resp.json().get("id")
    except Exception as e:
        logger.error(f"Email send error: {e}")
        return None


def _wrap(inner: str) -> str:
    site = FRONTEND_URL if FRONTEND_URL.startswith("https://") else ""
    footer_link = f'<p style="margin:18px 0 0"><a href="{escape(site)}" style="color:#2A4038">Visit DORIN TRAVEL</a></p>' if site else ""
    return (f'<table role="presentation" width="100%" style="background:#FDFBF7;padding:28px 0">'
            f'<tr><td align="center"><table role="presentation" width="560" '
            f'style="background:#ffffff;border:1px solid #E2DDD5;border-radius:16px;overflow:hidden">'
            f'<tr><td style="background:#2A4038;padding:22px 32px">'
            f'<span style="font-family:Georgia,serif;font-size:22px;color:#FDFBF7;font-weight:600">DORIN<span style="color:#C86D51">.</span> TRAVEL</span></td></tr>'
            f'<tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#1C1E1D;font-size:15px;line-height:1.6">'
            f'{inner}{footer_link}'
            f'<p style="font-size:12px;color:#888;margin-top:24px">Sent by {escape(EMAIL_FROM_NAME)}. '
            f'We never ask for your password or payment details by email.</p>'
            f'</td></tr></table></td></tr></table>')


async def send_welcome_email(to: str, first_name: str):
    inner = (f'<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px">Welcome aboard, {escape(first_name)}!</h1>'
             f'<p>Your DORIN TRAVEL account is ready. You can now save destinations, track your enquiries '
             f'and get travel ideas tailored to the way you like to travel.</p>'
             f'<p>Wherever you are dreaming of going next, we are here to help you plan it beautifully.</p>'
             f'<p style="margin-top:16px">Discover more. Travel better.<br/><strong>The DORIN TRAVEL team</strong></p>')
    return await send_email(to=to, subject="Welcome to DORIN TRAVEL", html=_wrap(inner))


async def send_enquiry_confirmation(to: str, name: str, destination: str):
    dest = f" to <strong>{escape(destination)}</strong>" if destination else ""
    inner = (f'<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px">Thank you, {escape(name)}</h1>'
             f'<p>We have received your travel enquiry{dest} and one of our UK-based specialists will be '
             f'in touch within 24 hours with personalised ideas.</p>'
             f'<p>In the meantime, feel free to keep exploring destinations and offers on our site.</p>'
             f'<p style="margin-top:16px">Discover more. Travel better.<br/><strong>The DORIN TRAVEL team</strong></p>')
    return await send_email(to=to, subject="We've received your DORIN TRAVEL enquiry", html=_wrap(inner))


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ----------------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------------
class SessionIn(BaseModel):
    session_id: Optional[str] = None


class BlogArticleIn(BaseModel):
    title: str
    category: str
    excerpt: str
    image: str
    content: str
    author: Optional[str] = "The DORIN Team"
    read_time: Optional[str] = "5 min read"
    date: Optional[str] = None
    slug: Optional[str] = None


class NewsletterIn(BaseModel):
    first_name: str
    email: EmailStr
    interests: List[str] = []
    consent: bool = True


class EnquiryIn(BaseModel):
    name: str
    email: EmailStr
    destination: Optional[str] = ""
    travel_dates: Optional[str] = ""
    travellers: Optional[str] = ""
    trip_type: Optional[str] = ""
    budget: Optional[str] = ""
    message: Optional[str] = ""


class ContactIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    destination: Optional[str] = ""
    travel_dates: Optional[str] = ""
    travellers: Optional[str] = ""
    budget: Optional[str] = ""
    message: str


class PreferencesIn(BaseModel):
    trip_types: List[str] = []
    budget: Optional[str] = ""
    home_airport: Optional[str] = ""
    newsletter: bool = True


class SavedToggleIn(BaseModel):
    type: str  # "destination" | "offer"
    item_id: str


class TrackIn(BaseModel):
    event: str
    props: dict = {}
    session_id: Optional[str] = ""


# ----------------------------------------------------------------------------
# App + router
# ----------------------------------------------------------------------------
app = FastAPI(title="DORIN Travel API")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "DORIN Travel API"}


# ----------------------- Auth (Google OAuth) -----------------------
@api_router.post("/auth/session")
async def auth_session(request: Request, response: Response, body: SessionIn = None):
    session_id = request.headers.get("X-Session-ID")
    if not session_id and body:
        session_id = body.session_id
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session id")
    try:
        async with httpx.AsyncClient(timeout=30) as hc:
            r = await hc.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": session_id})
    except Exception as e:
        logger.error(f"session-data call failed: {e}")
        raise HTTPException(status_code=502, detail="Auth provider unreachable")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    data = r.json()
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=401, detail="No email from provider")
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture") or ""
    session_token = data["session_token"]
    admin_email = os.environ.get("ADMIN_EMAIL", "").lower()
    parts = name.split(" ", 1)
    first_name, last_name = parts[0], (parts[1] if len(parts) > 1 else "")

    existing = await db.users.find_one({"email": email})
    is_new = existing is None
    if is_new:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": name,
            "first_name": first_name, "last_name": last_name, "picture": picture,
            "role": "admin" if email == admin_email else "customer",
            "marketing_opt_in": False, "preferences": {},
            "saved_destinations": [], "saved_offers": [], "created_at": now_iso(),
        })
    else:
        user_id = existing.get("user_id") or f"user_{uuid.uuid4().hex[:12]}"
        update = {"name": name, "picture": picture, "user_id": user_id}
        if email == admin_email and existing.get("role") != "admin":
            update["role"] = "admin"
        await db.users.update_one({"_id": existing["_id"]}, {"$set": update})

    expires = datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {"user_id": user_id, "session_token": session_token,
                  "expires_at": expires.isoformat(), "created_at": now_iso()}},
        upsert=True)
    set_session_cookie(response, session_token)

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if is_new:
        await send_welcome_email(email, first_name or name)
    return serialize_user(user)


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


# ----------------------- Account / Dashboard -----------------------
@api_router.put("/me/preferences")
async def update_preferences(body: PreferencesIn, user: dict = Depends(get_current_user)):
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"preferences": body.model_dump()}})
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return serialize_user(updated)


@api_router.post("/me/saved")
async def toggle_saved(body: SavedToggleIn, user: dict = Depends(get_current_user)):
    field = "saved_destinations" if body.type == "destination" else "saved_offers"
    current = user.get(field, [])
    if body.item_id in current:
        current.remove(body.item_id)
    else:
        current.append(body.item_id)
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {field: current}})
    return {field: current}


@api_router.get("/me/trips")
async def my_trips(user: dict = Depends(get_current_user)):
    trips = await db.leads.find(
        {"user_id": user["user_id"], "type": {"$in": ["enquiry", "contact"]}}
    ).sort("created_at", -1).to_list(100)
    return [{"id": str(t["_id"]), "destination": t.get("destination", ""),
             "trip_type": t.get("trip_type", ""), "travel_dates": t.get("travel_dates", ""),
             "status": t.get("status", "Enquiry received"), "created_at": t.get("created_at", "")}
            for t in trips]


# ----------------------- Leads / CRM -----------------------
@api_router.post("/leads/newsletter")
async def newsletter(body: NewsletterIn):
    doc = {"type": "newsletter", "first_name": body.first_name, "email": body.email.lower(),
           "interests": body.interests, "consent": body.consent, "source": "website",
           "created_at": now_iso()}
    await db.leads.insert_one(doc)
    return {"message": "Welcome to the Travel Club! Check your inbox for inspiration."}


async def _optional_user_id(request: Request) -> Optional[str]:
    try:
        u = await get_current_user(request)
        return u["user_id"]
    except HTTPException:
        return None


@api_router.post("/leads/enquiry")
async def enquiry(body: EnquiryIn, request: Request):
    doc = body.model_dump()
    doc.update({"type": "enquiry", "email": body.email.lower(), "status": "Enquiry received",
                "user_id": await _optional_user_id(request), "created_at": now_iso()})
    await db.leads.insert_one(doc)
    await send_enquiry_confirmation(body.email.lower(), body.name, body.destination or "")
    return {"message": "Thank you! One of our travel specialists will be in touch within 24 hours."}


@api_router.post("/leads/contact")
async def contact(body: ContactIn, request: Request):
    doc = body.model_dump()
    doc.update({"type": "contact", "email": body.email.lower(), "status": "Enquiry received",
                "user_id": await _optional_user_id(request), "created_at": now_iso()})
    await db.leads.insert_one(doc)
    await send_enquiry_confirmation(body.email.lower(), body.name, body.destination or "")
    return {"message": "Your enquiry has been sent. We'll reply within one business day."}


@api_router.get("/leads")
async def list_leads(_: dict = Depends(require_admin)):
    leads = await db.leads.find().sort("created_at", -1).to_list(500)
    for l in leads:
        l["id"] = str(l.pop("_id"))
    return leads


# ----------------------- Blog -----------------------
@api_router.get("/blog")
async def list_blog(category: Optional[str] = None):
    query = {}
    if category and category != "All":
        query["category"] = category
    articles = await db.blog_articles.find(query, {"content": 0}).sort("date", -1).to_list(100)
    for a in articles:
        a["id"] = str(a.pop("_id"))
    return articles


@api_router.get("/blog/{slug}")
async def get_article(slug: str):
    article = await db.blog_articles.find_one({"slug": slug})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    article["id"] = str(article.pop("_id"))
    related = await db.blog_articles.find(
        {"category": article["category"], "slug": {"$ne": slug}}, {"content": 0}
    ).limit(3).to_list(3)
    for r in related:
        r["id"] = str(r.pop("_id"))
    article["related"] = related
    return article


# ----------------------- Blog admin (CMS) -----------------------
def _slugify(title: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return s[:80] or uuid.uuid4().hex[:8]


@api_router.get("/admin/blog")
async def admin_list_blog(_: dict = Depends(require_admin)):
    arts = await db.blog_articles.find().sort("date", -1).to_list(200)
    for a in arts:
        a["id"] = str(a.pop("_id"))
    return arts


@api_router.post("/blog")
async def create_article(body: BlogArticleIn, _: dict = Depends(require_admin)):
    slug = body.slug or _slugify(body.title)
    if await db.blog_articles.find_one({"slug": slug}):
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"
    doc = {"slug": slug, "title": body.title, "category": body.category,
           "excerpt": body.excerpt, "image": body.image, "content": body.content,
           "author": body.author or "The DORIN Team",
           "read_time": body.read_time or "5 min read",
           "date": body.date or now_iso()[:10]}
    res = await db.blog_articles.insert_one(doc)
    doc.pop("_id", None)
    doc["id"] = str(res.inserted_id)
    return doc


@api_router.put("/blog/{article_id}")
async def update_article(article_id: str, body: BlogArticleIn, _: dict = Depends(require_admin)):
    update = {k: v for k, v in body.model_dump().items() if v is not None and k != "slug"}
    res = await db.blog_articles.update_one({"_id": ObjectId(article_id)}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    art = await db.blog_articles.find_one({"_id": ObjectId(article_id)})
    art["id"] = str(art.pop("_id"))
    return art


@api_router.delete("/blog/{article_id}")
async def delete_article(article_id: str, _: dict = Depends(require_admin)):
    res = await db.blog_articles.delete_one({"_id": ObjectId(article_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"message": "Article deleted"}


# ----------------------- Analytics -----------------------
@api_router.post("/analytics/track")
async def track(body: TrackIn):
    await db.analytics_events.insert_one({"event": body.event, "props": body.props,
                                          "session_id": body.session_id, "created_at": now_iso()})
    return {"ok": True}


@api_router.get("/analytics/summary")
async def analytics_summary(_: dict = Depends(require_admin)):
    pipeline = [{"$group": {"_id": "$event", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    by_event = await db.analytics_events.aggregate(pipeline).to_list(100)
    total_events = await db.analytics_events.count_documents({})
    total_leads = await db.leads.count_documents({})
    newsletter_leads = await db.leads.count_documents({"type": "newsletter"})
    enquiries = await db.leads.count_documents({"type": {"$in": ["enquiry", "contact"]}})
    total_users = await db.users.count_documents({"role": "customer"})
    recent = await db.analytics_events.find().sort("created_at", -1).limit(25).to_list(25)
    for r in recent:
        r["id"] = str(r.pop("_id"))
    return {
        "totals": {"events": total_events, "leads": total_leads, "newsletter": newsletter_leads,
                   "enquiries": enquiries, "users": total_users},
        "by_event": [{"event": e["_id"], "count": e["count"]} for e in by_event],
        "recent": recent,
    }


# ----------------------------------------------------------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[o.strip() for o in os.environ.get('CORS_ORIGINS', '*').split(',')],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------------------------------------------------------
# Startup: indexes, admin seed, blog seed
# ----------------------------------------------------------------------------
BLOG_SEED = [
    {
        "slug": "10-european-cities-weekend-escape",
        "title": "10 European Cities Perfect for a Weekend Escape",
        "category": "City Breaks",
        "excerpt": "From Lisbon's tiled lanes to Vienna's coffee houses, these ten cities prove you don't need a fortnight to feel like you've truly travelled.",
        "image": "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "author": "Elena Marsh", "read_time": "7 min read", "date": "2026-05-28",
        "content": "A great weekend escape is about rhythm, not distance. The best European short-break cities reward you the moment you step off the plane with walkable centres, unforgettable food and just enough to see that you leave wanting more.\n\nLisbon tops our list for golden light and pastel de nata; Barcelona for its architecture and beaches within a single metro ride; and Vienna for grand cafes where lingering is an art form. Krakow, Porto, Copenhagen, Seville, Bologna, Ljubljana and Bruges round out a line-up that balances culture, cuisine and that priceless sense of discovery.\n\nThe secret to a perfect 48-hour city break is to pick two neighbourhoods and go deep rather than racing across the whole map. Book a central hotel, walk everywhere, and leave one evening entirely unplanned. That's usually where the best memories happen.",
    },
    {
        "slug": "plan-your-first-solo-trip",
        "title": "How to Plan Your First Solo Trip",
        "category": "Travel Tips",
        "excerpt": "Travelling alone for the first time is equal parts thrilling and daunting. Here's how to plan a solo adventure that feels safe, social and genuinely yours.",
        "image": "https://images.unsplash.com/photo-1501555088652-021faa106b9b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "author": "Priya Nair", "read_time": "6 min read", "date": "2026-05-20",
        "content": "Your first solo trip is a rite of passage. The freedom to wake when you like, eat where you fancy and change plans on a whim is intoxicating once you lean into it.\n\nStart somewhere confidence-building: a compact, well-connected city where English is widely spoken and public transport is simple. Choose accommodation with communal spaces if you want to meet people, book the first night's stay in advance, and keep your itinerary loose.\n\nSafety is mostly common sense: share your plans with someone at home, keep digital copies of documents, and trust your instincts. The biggest surprise for most first-time solo travellers? How quickly you stop feeling alone and start feeling free.",
    },
    {
        "slug": "best-mediterranean-destinations-summer",
        "title": "Best Mediterranean Destinations for Summer",
        "category": "Destination Inspiration",
        "excerpt": "Turquoise coves, long lunches and warm evenings. These are the Mediterranean corners worth building an entire summer around.",
        "image": "https://images.unsplash.com/photo-1633321088768-b994237c8aa8?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "author": "Marco Bellini", "read_time": "8 min read", "date": "2026-05-12",
        "content": "The Mediterranean in summer is a mood as much as a place. For classic glamour, the Amalfi Coast delivers cliffside villages and lemon-scented terraces. For island-hopping, the Greek Cyclades pair whitewashed beauty with easy ferry connections.\n\nIf you want fewer crowds, look to Puglia's trulli towns, Montenegro's Bay of Kotor or the quieter beaches of Menorca. Each offers that essential Mediterranean trio: exceptional food, swimmable water and evenings that stretch late into the night.\n\nBook the big-name spots early and the hidden gems with flexibility. Shoulder weeks in late June and early September give you the warmth without the peak-season prices.",
    },
    {
        "slug": "travel-more-without-spending-more",
        "title": "How to Travel More Without Spending More",
        "category": "Budget Travel",
        "excerpt": "Smart travellers aren't always big spenders. These practical habits help you see more of the world on the budget you already have.",
        "image": "https://images.unsplash.com/photo-1501868984184-76121ed6a6e2?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "author": "Daniel Osei", "read_time": "5 min read", "date": "2026-05-04",
        "content": "Travelling more often comes down to flexibility and timing rather than luck. Flying midweek, travelling in shoulder season and setting price alerts can cut your biggest costs dramatically.\n\nBe loyal to a single airline alliance to build points, use a card with no foreign transaction fees, and favour apartments with kitchens for longer stays. A weekly food shop plus one standout restaurant meal a day is both cheaper and more authentic than eating out for every meal.\n\nFinally, travel slower. Spending a week in one base rather than three nights in three cities saves on transport, reduces stress and almost always deepens the experience.",
    },
    {
        "slug": "48-hours-in-lisbon",
        "title": "48 Hours in Lisbon",
        "category": "Travel Guides",
        "excerpt": "A perfectly paced two-day itinerary through Lisbon's hills, viewpoints and tasca kitchens, built for first-time visitors.",
        "image": "https://images.unsplash.com/photo-1697748525265-7431cba075b6?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "author": "Elena Marsh", "read_time": "9 min read", "date": "2026-04-26",
        "content": "Day one belongs to the classics. Start in Alfama, following the rattling 28 tram uphill before wandering down through the oldest quarter to the river. Lunch on grilled sardines, then spend the afternoon in Belem with its monastery and the original pastel de nata.\n\nAs the sun drops, climb to a miradouro viewpoint with a glass of vinho verde. Lisbon's light at golden hour is reason enough to visit.\n\nDay two is for discovery: the design shops of Chiado, the food stalls of Time Out Market, and an evening of fado in a candlelit tavern. Two days is never quite enough here, but it's the perfect introduction to a city you'll want to return to.",
    },
    {
        "slug": "hidden-gems-in-italy",
        "title": "Hidden Gems in Italy",
        "category": "Destination Inspiration",
        "excerpt": "Beyond Rome, Florence and Venice lies an Italy of quiet hill towns, empty beaches and kitchens that haven't changed in generations.",
        "image": "https://images.unsplash.com/photo-1603199766980-fdd4ac568a11?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "author": "Marco Bellini", "read_time": "7 min read", "date": "2026-04-18",
        "content": "Italy rewards those who stray from the headline cities. In Puglia, the whitewashed trulli of Alberobello and the baroque streets of Lecce feel worlds away from the tourist trail.\n\nHead north to the Langhe for rolling vineyards and truffle-rich cuisine, or to the pastel fishing villages of Liguria beyond the famous five of Cinque Terre. In the centre, Umbria offers the beauty of Tuscany with half the crowds.\n\nThe common thread is slowness. Eat where the menu is handwritten, stay in family-run agriturismi, and let long lunches dictate the pace of your days.",
    },
    {
        "slug": "what-to-pack-for-a-city-break",
        "title": "What to Pack for a City Break",
        "category": "Travel Tips",
        "excerpt": "The art of the carry-on capsule. Pack lighter, walk further and never check a bag for a weekend away again.",
        "image": "https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "author": "Priya Nair", "read_time": "4 min read", "date": "2026-04-10",
        "content": "A great city break wardrobe is built around a single colour palette so everything mixes. Three tops, two bottoms, one layer and one pair of genuinely comfortable shoes will carry you through a long weekend with ease.\n\nRoll rather than fold, use a small packing cube for underwear and tech, and keep a foldable tote for day trips. Leave the just-in-case items at home; cities have shops.\n\nThe real luxury of travelling light is freedom: no baggage carousel, easy public transport and the ability to walk straight out of the airport into your trip.",
    },
    {
        "slug": "best-romantic-destinations-for-couples",
        "title": "Best Romantic Destinations for Couples",
        "category": "Couples",
        "excerpt": "Whether you crave candlelit cities or private island sunsets, these destinations are built for two.",
        "image": "https://images.unsplash.com/photo-1513279922550-250c2129b13a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "author": "Sophie Laurent", "read_time": "6 min read", "date": "2026-04-02",
        "content": "Romance looks different for every couple. For timeless city romance, nothing beats Paris in spring or Venice out of season when the canals belong to locals again.\n\nIf you'd rather swap pavements for sunsets, Santorini's caldera-view suites and the overwater villas of the Indian Ocean set a high bar. For something more active, pair a few days hiking in the Dolomites with a spa retreat to recover.\n\nThe secret ingredient is always the same: at least one unhurried, unplanned evening with nowhere to be and no screens to check.",
    },
    {
        "slug": "paris-vs-rome-city-break",
        "title": "Paris vs Rome: Which City Break Is Right for You?",
        "category": "City Breaks",
        "excerpt": "Two of Europe's most beloved capitals, head to head. We compare food, culture, pace and value to help you choose.",
        "image": "https://images.unsplash.com/photo-1549144511-f099e773c147?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "author": "Elena Marsh", "read_time": "8 min read", "date": "2026-03-25",
        "content": "Paris is elegance and edit: grand boulevards, world-class museums and a cafe culture built for people-watching. Rome is layered chaos in the best way, with ancient ruins around every corner and food that prizes simplicity above all.\n\nChoose Paris for art, fashion and romance, and for a city that rewards slow, stylish days. Choose Rome for history you can touch, lively piazzas and arguably the best-value dining of any major European capital.\n\nStill can't decide? Both are superb for first-timers. Our specialists often pair them into a single twin-city itinerary connected by a short flight or scenic train.",
    },
    {
        "slug": "5-reasons-book-city-break-with-dorin",
        "title": "5 Reasons to Book Your Next City Break With DORIN",
        "category": "Travel Guides",
        "excerpt": "From handpicked hotels to 24/7 UK support, here's what changes when you plan your trip with a specialist rather than a search engine.",
        "image": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "author": "The DORIN Team", "read_time": "5 min read", "date": "2026-03-17",
        "content": "Booking with a specialist isn't about paying more; it's about travelling better. Here's what sets a DORIN city break apart.\n\nFirst, every itinerary is personalised to how you actually like to travel. Second, our hotels are handpicked and visited, not pulled from an endless list. Third, you get one point of contact who knows your trip inside out.\n\nFourth, our UK-based team is on hand around the clock if plans change. And fifth, transparent pricing means no surprises. The result is a trip that feels designed for you, with none of the stress of planning it alone.",
    },
    {
        "slug": "best-european-destinations-2027",
        "title": "Best European Destinations for 2027",
        "category": "Destination Inspiration",
        "excerpt": "The places our specialists are most excited about next year, from rising-star cities to coastlines before the crowds arrive.",
        "image": "https://images.unsplash.com/photo-1579282240050-352db0a14c21?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "author": "The DORIN Team", "read_time": "7 min read", "date": "2026-03-09",
        "content": "Every year a handful of destinations shift from insider tip to must-visit. For 2027, we're watching the Albanian Riviera for Mediterranean beauty at a fraction of the price, and Tbilisi for a food and wine scene that's quietly become one of Europe's most exciting.\n\nClassic favourites are evolving too: Portugal's Azores for wild green drama, Slovenia for lake-and-mountain serenity, and the Baltic capitals for walkable charm and real value.\n\nWherever 2027 takes you, book the headline spots early and keep a little flexibility for the places that surprise you along the way.",
    },
    {
        "slug": "best-adventure-trips-for-thrill-seekers",
        "title": "Best Adventure Trips for Thrill Seekers",
        "category": "Adventure",
        "excerpt": "Trade the sun lounger for something that gets the heart racing, from alpine trails to desert nights under the stars.",
        "image": "https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "author": "Daniel Osei", "read_time": "6 min read", "date": "2026-03-01",
        "content": "Adventure travel is having a moment, and for good reason: nothing resets the mind like a proper physical challenge in a spectacular setting.\n\nFor first-timers, a guided hut-to-hut trek in the Dolomites or the Scottish Highlands offers big rewards without big risk. More experienced travellers might tackle Iceland's highlands, a Moroccan desert expedition, or a multi-day kayak through Norway's fjords.\n\nWhatever the trip, invest in the right footwear, train a little beforehand, and go with a reputable guide. The best adventures push you just far enough outside your comfort zone to come home changed.",
    },
]


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id")
    await db.user_sessions.create_index("session_token", unique=True)
    await db.leads.create_index("created_at")
    await db.analytics_events.create_index("created_at")
    await db.blog_articles.create_index("slug", unique=True)

    # blog seed (idempotent)
    for art in BLOG_SEED:
        await db.blog_articles.update_one({"slug": art["slug"]}, {"$setOnInsert": art}, upsert=True)
    logger.info("Startup seed complete")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
