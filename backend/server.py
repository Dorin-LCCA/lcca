from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated

import bcrypt
import jwt
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

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


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
# Auth utils
# ----------------------------------------------------------------------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")


def serialize_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "role": user.get("role", "customer"),
        "marketing_opt_in": user.get("marketing_opt_in", False),
        "preferences": user.get("preferences", {}),
        "saved_destinations": user.get("saved_destinations", []),
        "saved_offers": user.get("saved_offers", []),
        "created_at": user.get("created_at", ""),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ----------------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------------
class RegisterIn(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    marketing_opt_in: bool = False


class LoginIn(BaseModel):
    email: EmailStr
    password: str


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
app = FastAPI(title="VOYARA Travel API")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "VOYARA Travel API"}


# ----------------------- Auth -----------------------
@api_router.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "first_name": body.first_name.strip(),
        "last_name": body.last_name.strip(),
        "role": "customer",
        "marketing_opt_in": body.marketing_opt_in,
        "preferences": {},
        "saved_destinations": [],
        "saved_offers": [],
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    uid = str(res.inserted_id)
    if body.marketing_opt_in:
        await db.leads.insert_one({"type": "newsletter", "first_name": body.first_name,
                                   "email": email, "interests": [], "source": "registration",
                                   "created_at": now_iso()})
    set_auth_cookies(response, create_access_token(uid, email), create_refresh_token(uid))
    return serialize_user(doc)


@api_router.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.fromisoformat(locked_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in a few minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        new_count = (attempt.get("count", 0) if attempt else 0) + 1
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$set": {"count": new_count,
                      "locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    await db.login_attempts.delete_one({"identifier": identifier})
    uid = str(user["_id"])
    set_auth_cookies(response, create_access_token(uid, email), create_refresh_token(uid))
    return serialize_user(user)


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        response.set_cookie("access_token", create_access_token(str(user["_id"]), user["email"]),
                            httponly=True, secure=True, samesite="none", max_age=3600, path="/")
        return {"message": "refreshed"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ----------------------- Account / Dashboard -----------------------
@api_router.put("/me/preferences")
async def update_preferences(body: PreferencesIn, user: dict = Depends(get_current_user)):
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"preferences": body.model_dump()}})
    updated = await db.users.find_one({"_id": user["_id"]})
    return serialize_user(updated)


@api_router.post("/me/saved")
async def toggle_saved(body: SavedToggleIn, user: dict = Depends(get_current_user)):
    field = "saved_destinations" if body.type == "destination" else "saved_offers"
    current = user.get(field, [])
    if body.item_id in current:
        current.remove(body.item_id)
    else:
        current.append(body.item_id)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {field: current}})
    return {field: current}


@api_router.get("/me/trips")
async def my_trips(user: dict = Depends(get_current_user)):
    trips = await db.leads.find(
        {"user_id": str(user["_id"]), "type": {"$in": ["enquiry", "contact"]}}
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
        return str(u["_id"])
    except HTTPException:
        return None


@api_router.post("/leads/enquiry")
async def enquiry(body: EnquiryIn, request: Request):
    doc = body.model_dump()
    doc.update({"type": "enquiry", "email": body.email.lower(), "status": "Enquiry received",
                "user_id": await _optional_user_id(request), "created_at": now_iso()})
    await db.leads.insert_one(doc)
    return {"message": "Thank you! One of our travel specialists will be in touch within 24 hours."}


@api_router.post("/leads/contact")
async def contact(body: ContactIn, request: Request):
    doc = body.model_dump()
    doc.update({"type": "contact", "email": body.email.lower(), "status": "Enquiry received",
                "user_id": await _optional_user_id(request), "created_at": now_iso()})
    await db.leads.insert_one(doc)
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
        "slug": "5-reasons-book-city-break-with-voyara",
        "title": "5 Reasons to Book Your Next City Break With VOYARA",
        "category": "Travel Guides",
        "excerpt": "From handpicked hotels to 24/7 UK support, here's what changes when you plan your trip with a specialist rather than a search engine.",
        "image": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "author": "The VOYARA Team", "read_time": "5 min read", "date": "2026-03-17",
        "content": "Booking with a specialist isn't about paying more; it's about travelling better. Here's what sets a VOYARA city break apart.\n\nFirst, every itinerary is personalised to how you actually like to travel. Second, our hotels are handpicked and visited, not pulled from an endless list. Third, you get one point of contact who knows your trip inside out.\n\nFourth, our UK-based team is on hand around the clock if plans change. And fifth, transparent pricing means no surprises. The result is a trip that feels designed for you, with none of the stress of planning it alone.",
    },
    {
        "slug": "best-european-destinations-2027",
        "title": "Best European Destinations for 2027",
        "category": "Destination Inspiration",
        "excerpt": "The places our specialists are most excited about next year, from rising-star cities to coastlines before the crowds arrive.",
        "image": "https://images.unsplash.com/photo-1579282240050-352db0a14c21?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
        "author": "The VOYARA Team", "read_time": "7 min read", "date": "2026-03-09",
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
    await db.login_attempts.create_index("identifier")
    await db.leads.create_index("created_at")
    await db.analytics_events.create_index("created_at")
    await db.blog_articles.create_index("slug", unique=True)

    # admin seed
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@voyaratravel.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password),
            "first_name": "VOYARA", "last_name": "Admin", "role": "admin",
            "marketing_opt_in": False, "preferences": {}, "saved_destinations": [],
            "saved_offers": [], "created_at": now_iso(),
        })
        logger.info("Seeded admin user")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})

    # blog seed (idempotent)
    for art in BLOG_SEED:
        await db.blog_articles.update_one({"slug": art["slug"]}, {"$setOnInsert": art}, upsert=True)
    logger.info("Blog seed complete")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
