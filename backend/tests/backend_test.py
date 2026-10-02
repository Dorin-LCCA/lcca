"""
VOYARA Travel - Backend API tests.
Covers: health, auth (register/login/me/logout/wrong password),
admin RBAC for /leads and /analytics/summary, lead CRUD + persistence,
blog listing/filter/detail/404, analytics track + summary,
dashboard: toggle saved, preferences, my-trips.
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback for backend-container env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@voyaratravel.com"
ADMIN_PASSWORD = "Voyara2026!"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    assert r.json().get("role") == "admin"
    return s


@pytest.fixture(scope="session")
def customer_session():
    s = requests.Session()
    unique = f"TEST_cust_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={
        "first_name": "Test", "last_name": "User",
        "email": unique, "password": "Traveller2026!", "marketing_opt_in": True
    }, timeout=20)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["email"] == unique.lower()
    assert data["role"] == "customer"
    s.email = unique  # type: ignore
    s.user_id = data["id"]  # type: ignore
    return s


# ---------- Health ----------
def test_health_root():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert "message" in r.json()


# ---------- Auth ----------
class TestAuth:
    def test_register_sets_cookies_and_returns_user(self):
        s = requests.Session()
        email = f"TEST_reg_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={
            "first_name": "Reg", "last_name": "User", "email": email,
            "password": "Password123!", "marketing_opt_in": False
        }, timeout=20)
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == email.lower()
        assert body["role"] == "customer"
        assert "id" in body
        # cookies set
        assert "access_token" in s.cookies.get_dict()
        assert "refresh_token" in s.cookies.get_dict()
        # /auth/me works
        me = s.get(f"{API}/auth/me", timeout=15)
        assert me.status_code == 200
        assert me.json()["email"] == email.lower()

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong-password-xyz"}, timeout=15)
        assert r.status_code == 401

    def test_login_admin_and_logout(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert r.status_code == 200
        assert "access_token" in s.cookies.get_dict()
        lo = s.post(f"{API}/auth/logout", timeout=15)
        assert lo.status_code == 200
        # after logout, /me should be 401
        me = s.get(f"{API}/auth/me", timeout=15)
        assert me.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401


# ---------- Admin RBAC ----------
class TestAdminRBAC:
    def test_admin_can_list_leads(self, admin_session):
        r = admin_session.get(f"{API}/leads", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_analytics_summary(self, admin_session):
        r = admin_session.get(f"{API}/analytics/summary", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "totals" in data and "by_event" in data and "recent" in data
        assert "events" in data["totals"]

    def test_customer_forbidden_from_leads(self, customer_session):
        r = customer_session.get(f"{API}/leads", timeout=15)
        assert r.status_code == 403

    def test_customer_forbidden_from_analytics(self, customer_session):
        r = customer_session.get(f"{API}/analytics/summary", timeout=15)
        assert r.status_code == 403


# ---------- Leads ----------
class TestLeads:
    def test_newsletter_lead(self, admin_session):
        email = f"TEST_news_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/leads/newsletter",
                          json={"first_name": "Nina", "email": email, "interests": ["Beach"], "consent": True},
                          timeout=15)
        assert r.status_code == 200
        assert "message" in r.json()
        # verify persisted
        leads = admin_session.get(f"{API}/leads", timeout=20).json()
        assert any(l.get("email") == email.lower() and l.get("type") == "newsletter" for l in leads)

    def test_enquiry_lead(self, admin_session, customer_session):
        email = getattr(customer_session, "email")
        r = customer_session.post(f"{API}/leads/enquiry", json={
            "name": "Test User", "email": email, "destination": "Kyoto",
            "trip_type": "Culture", "travel_dates": "Mar 2026", "travellers": "2",
            "budget": "Mid", "message": "Test enquiry"
        }, timeout=15)
        assert r.status_code == 200
        leads = admin_session.get(f"{API}/leads", timeout=20).json()
        assert any(l.get("email") == email.lower() and l.get("type") == "enquiry" for l in leads)
        # also appears in /me/trips
        trips = customer_session.get(f"{API}/me/trips", timeout=15)
        assert trips.status_code == 200
        assert any(t.get("destination") == "Kyoto" for t in trips.json())

    def test_contact_lead(self, admin_session):
        email = f"TEST_contact_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/leads/contact", json={
            "name": "Contact Guy", "email": email, "message": "Please call me."
        }, timeout=15)
        assert r.status_code == 200
        leads = admin_session.get(f"{API}/leads", timeout=20).json()
        assert any(l.get("email") == email.lower() and l.get("type") == "contact" for l in leads)


# ---------- Blog ----------
class TestBlog:
    def test_list_blog(self):
        r = requests.get(f"{API}/blog", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 12, f"Expected >=12 seeded articles, got {len(data)}"

    def test_filter_blog_city_breaks(self):
        r = requests.get(f"{API}/blog", params={"category": "City Breaks"}, timeout=15)
        assert r.status_code == 200
        for a in r.json():
            assert a.get("category") == "City Breaks"

    def test_get_article_by_slug(self):
        # Get first slug
        r = requests.get(f"{API}/blog", timeout=15)
        slug = r.json()[0]["slug"]
        det = requests.get(f"{API}/blog/{slug}", timeout=15)
        assert det.status_code == 200
        body = det.json()
        assert body["slug"] == slug
        assert "content" in body
        assert "related" in body and isinstance(body["related"], list)

    def test_unknown_slug_404(self):
        r = requests.get(f"{API}/blog/this-does-not-exist-xyz", timeout=15)
        assert r.status_code == 404


# ---------- Analytics ----------
class TestAnalytics:
    def test_track_then_summary(self, admin_session):
        unique_event = f"TEST_evt_{uuid.uuid4().hex[:6]}"
        for _ in range(2):
            r = requests.post(f"{API}/analytics/track",
                              json={"event": unique_event, "props": {"x": 1}, "session_id": "sess1"},
                              timeout=15)
            assert r.status_code == 200
        time.sleep(0.3)
        summary = admin_session.get(f"{API}/analytics/summary", timeout=20).json()
        found = [e for e in summary["by_event"] if e["event"] == unique_event]
        assert found, f"Event {unique_event} not reflected in by_event"
        assert found[0]["count"] >= 2


# ---------- Dashboard ----------
class TestDashboard:
    def test_toggle_saved_destination(self, customer_session):
        r = customer_session.post(f"{API}/me/saved",
                                  json={"type": "destination", "item_id": "dest-1"}, timeout=15)
        assert r.status_code == 200
        assert "dest-1" in r.json()["saved_destinations"]
        # toggle again -> removes
        r2 = customer_session.post(f"{API}/me/saved",
                                   json={"type": "destination", "item_id": "dest-1"}, timeout=15)
        assert r2.status_code == 200
        assert "dest-1" not in r2.json()["saved_destinations"]

    def test_update_preferences(self, customer_session):
        payload = {"trip_types": ["Beach", "Culture"], "budget": "Mid",
                   "home_airport": "LHR", "newsletter": True}
        r = customer_session.put(f"{API}/me/preferences", json=payload, timeout=15)
        assert r.status_code == 200
        assert r.json()["preferences"]["budget"] == "Mid"
        # persistence via /auth/me
        me = customer_session.get(f"{API}/auth/me", timeout=15).json()
        assert me["preferences"]["home_airport"] == "LHR"
        assert set(me["preferences"]["trip_types"]) == {"Beach", "Culture"}

    def test_my_trips_requires_auth(self):
        r = requests.get(f"{API}/me/trips", timeout=15)
        assert r.status_code == 401
