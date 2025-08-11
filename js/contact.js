// /js/contact.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// TODO: replace with your actual Supabase project values
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Track pageview on load (calls your serverless function)
window.addEventListener('load', () => {
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: location.pathname, referrer: document.referrer })
  }).catch(() => {});
});

// Render minimal UIs
const authSection    = document.getElementById('auth');
const contactSection = document.getElementById('contact-db');
const metricsSection = document.getElementById('metrics');

authSection.innerHTML = `
  <form id="signup">
    <input name="email" type="email" placeholder="Email" required>
    <input name="password" type="password" placeholder="Password" required>
    <button>Sign Up</button>
  </form>
  <form id="signin">
    <input name="email" type="email" placeholder="Email" required>
    <input name="password" type="password" placeholder="Password" required>
    <button>Sign In</button>
  </form>
  <button id="signout" style="display:none">Sign out</button>
  <p id="authStatus"></p>
`;

contactSection.innerHTML = `
  <form id="contactForm">
    <textarea name="body" placeholder="Message" required></textarea>
    <button>Send</button>
  </form>
  <p id="statusMsg"></p>
`;

metricsSection.innerHTML = `
  <button id="loadMetrics">Load last 30 days</button>
  <pre id="metricsOut"></pre>
`;

// Auth logic
const authStatus = document.getElementById('authStatus');
const signoutBtn = document.getElementById('signout');

async function refreshSession() {
  const { data: { session } } = await sb.auth.getSession();
  const authed = !!session;
  signoutBtn.style.display = authed ? 'inline-block' : 'none';
  document.querySelector('#contactForm button').disabled = !authed;
  authStatus.textContent = authed ? `Signed in as ${session.user.email}` : 'Not signed in';
}

document.getElementById('signup').addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const { error } = await sb.auth.signUp({ email: fd.get('email'), password: fd.get('password') });
  authStatus.textContent = error ? error.message : 'Sign-up ok (check email if confirmation is on).';
  refreshSession();
});

document.getElementById('signin').addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const { error } = await sb.auth.signInWithPassword({ email: fd.get('email'), password: fd.get('password') });
  authStatus.textContent = error ? error.message : 'Signed in.';
  refreshSession();
});

signoutBtn.addEventListener('click', async () => {
  await sb.auth.signOut();
  authStatus.textContent = 'Signed out.';
  refreshSession();
});

// Insert message (DB only)
const statusMsg = document.getElementById('statusMsg');
document.getElementById('contactForm').addEventListener('submit', async e => {
  e.preventDefault();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { statusMsg.textContent = 'Please sign in first.'; return; }

  const body = new FormData(e.currentTarget).get('body');
  const { error } = await sb.from('messages').insert({ sender_id: session.user.id, body });
  statusMsg.textContent = error ? error.message : 'Message stored.';
  if (!error) e.currentTarget.reset();
});

// Metrics fetch
document.getElementById('loadMetrics').addEventListener('click', async () => {
  const res = await fetch('/api/metrics');
  const data = await res.json();
  document.getElementById('metricsOut').textContent = JSON.stringify(data, null, 2);
});

refreshSession();
sb.auth.onAuthStateChange(refreshSession);
