"""DORIN Travel backend tests (iteration 2 - Google OAuth + Blog CRUD + Email)."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://travel-voyara-demo.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_TOKEN = "test_admin_session_token_123"
ADMIN_EMAIL = "spinudorin10@gmail.com"


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    s.cookies.set("session_token", ADMIN_TOKEN)
    return s


@pytest.fixture(scope="session")
def customer_session():
    """Seed a customer user+session via Mongo through API fallback; use plain POST to seed via mongosh is external.
    Instead, create session by calling /api/auth/session with no provider — not possible.
    We use a direct mongosh-populated token read from env or skip.
    """
    import subprocess, json
    token = f"test_customer_session_{int(time.time())}"
    uid = f"user_customer_{int(time.time())}"
    email = f"qa.customer.{int(time.time())}@example.com"
    cmd = f'''mongosh --quiet --eval 'use("test_database"); db.users.insertOne({{user_id:"{uid}",email:"{email}",name:"QA Customer",first_name:"QA",last_name:"Customer",picture:"",role:"customer",marketing_opt_in:false,preferences:{{}},saved_destinations:[],saved_offers:[],created_at:new Date().toISOString()}}); db.user_sessions.insertOne({{user_id:"{uid}",session_token:"{token}",expires_at:new Date(Date.now()+7*86400*1000).toISOString(),created_at:new Date().toISOString()}});' '''
    subprocess.run(cmd, shell=True, check=False, capture_output=True)
    s = requests.Session()
    s.cookies.set("session_token", token)
    s.user_id = uid
    s.email = email
    return s


# ---------------------- Auth ----------------------
class TestAuth:
    def test_me_no_cookie_401(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_session_no_header_400(self):
        r = requests.post(f"{API}/auth/session", json={})
        assert r.status_code == 400

    def test_register_removed(self):
        r = requests.post(f"{API}/auth/register", json={"email": "x@y.com", "password": "p"})
        assert r.status_code in (404, 405)

    def test_login_removed(self):
        r = requests.post(f"{API}/auth/login", json={"email": "x@y.com", "password": "p"})
        assert r.status_code in (404, 405)

    def test_me_admin_cookie(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"

    def test_me_bearer_token(self):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})
        assert r.status_code == 200
        assert r.json()["role"] == "admin"


# ---------------------- Blog public ----------------------
class TestBlogPublic:
    def test_list_blog(self):
        r = requests.get(f"{API}/blog")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 12

    def test_blog_detail(self):
        r = requests.get(f"{API}/blog/48-hours-in-lisbon")
        assert r.status_code == 200
        assert r.json()["slug"] == "48-hours-in-lisbon"


# ---------------------- Blog admin CRUD ----------------------
class TestBlogAdmin:
    created_id = None

    def test_admin_list_unauth(self):
        r = requests.get(f"{API}/admin/blog")
        assert r.status_code == 401

    def test_admin_list_forbidden_customer(self, customer_session):
        r = customer_session.get(f"{API}/admin/blog")
        assert r.status_code == 403

    def test_admin_list_ok(self, admin_session):
        r = admin_session.get(f"{API}/admin/blog")
        assert r.status_code == 200
        assert len(r.json()) >= 12

    def test_create_update_delete(self, admin_session):
        payload = {
            "title": "TEST_ Article From Pytest",
            "category": "Travel Tips",
            "excerpt": "test excerpt",
            "image": "https://images.unsplash.com/photo-1",
            "content": "test content body",
        }
        r = admin_session.post(f"{API}/blog", json=payload)
        assert r.status_code == 200, r.text
        art = r.json()
        assert "id" in art and "slug" in art
        aid = art["id"]

        # Create without auth -> 401
        r2 = requests.post(f"{API}/blog", json=payload)
        assert r2.status_code == 401

        # Update
        payload["title"] = "TEST_ Updated Title"
        r3 = admin_session.put(f"{API}/blog/{aid}", json=payload)
        assert r3.status_code == 200
        assert r3.json()["title"] == "TEST_ Updated Title"

        # Verify public list includes it
        r4 = requests.get(f"{API}/blog")
        assert any(a.get("title") == "TEST_ Updated Title" for a in r4.json())

        # Delete without auth
        r5 = requests.delete(f"{API}/blog/{aid}")
        assert r5.status_code == 401

        # Delete
        r6 = admin_session.delete(f"{API}/blog/{aid}")
        assert r6.status_code == 200

        # Verify gone - detail by slug returns 404
        r7 = requests.get(f"{API}/blog/{art['slug']}")
        assert r7.status_code == 404

    def test_customer_cannot_create(self, customer_session):
        r = customer_session.post(f"{API}/blog", json={
            "title": "x", "category": "x", "excerpt": "x", "image": "x", "content": "x"
        })
        assert r.status_code == 403


# ---------------------- Leads / Email ----------------------
class TestLeads:
    def test_newsletter(self):
        r = requests.post(f"{API}/leads/newsletter", json={
            "first_name": "QA", "email": "delivered@resend.dev",
            "interests": ["city"], "consent": True
        })
        assert r.status_code == 200

    def test_enquiry_triggers_email(self):
        r = requests.post(f"{API}/leads/enquiry", json={
            "name": "QA Tester", "email": "delivered@resend.dev",
            "destination": "Lisbon", "travel_dates": "June 2026",
            "travellers": "2", "trip_type": "City Break",
            "budget": "£2000", "message": "please"
        })
        assert r.status_code == 200
        assert "message" in r.json()

    def test_contact_triggers_email(self):
        r = requests.post(f"{API}/leads/contact", json={
            "name": "QA Tester", "email": "delivered@resend.dev",
            "message": "contact message here"
        })
        assert r.status_code == 200

    def test_leads_admin_only(self, admin_session):
        r = requests.get(f"{API}/leads")
        assert r.status_code == 401
        r2 = admin_session.get(f"{API}/leads")
        assert r2.status_code == 200
        assert isinstance(r2.json(), list)


# ---------------------- Dashboard / Me ----------------------
class TestDashboard:
    def test_preferences(self, customer_session):
        r = customer_session.put(f"{API}/me/preferences", json={
            "trip_types": ["city", "beach"], "budget": "£1500",
            "home_airport": "LHR", "newsletter": True
        })
        assert r.status_code == 200
        assert r.json()["preferences"]["budget"] == "£1500"

    def test_saved_toggle(self, customer_session):
        r = customer_session.post(f"{API}/me/saved", json={"type": "destination", "item_id": "lisbon"})
        assert r.status_code == 200
        assert "lisbon" in r.json()["saved_destinations"]
        # toggle off
        r2 = customer_session.post(f"{API}/me/saved", json={"type": "destination", "item_id": "lisbon"})
        assert "lisbon" not in r2.json()["saved_destinations"]

    def test_trips(self, customer_session):
        # Create enquiry linked to this user via cookie
        customer_session.post(f"{API}/leads/enquiry", json={
            "name": "QA", "email": customer_session.email,
            "destination": "Rome", "message": "hi"
        })
        r = customer_session.get(f"{API}/me/trips")
        assert r.status_code == 200
        trips = r.json()
        assert any(t["destination"] == "Rome" for t in trips)

    def test_logout(self, customer_session):
        r = customer_session.post(f"{API}/auth/logout")
        assert r.status_code == 200


# ---------------------- Analytics ----------------------
class TestAnalytics:
    def test_track(self):
        r = requests.post(f"{API}/analytics/track", json={
            "event": "page_view", "props": {"page": "/"}, "session_id": "sess1"
        })
        assert r.status_code == 200

    def test_summary_requires_admin(self, admin_session):
        r = requests.get(f"{API}/analytics/summary")
        assert r.status_code == 401
        r2 = admin_session.get(f"{API}/analytics/summary")
        assert r2.status_code == 200
        data = r2.json()
        assert "totals" in data and "by_event" in data and "recent" in data
