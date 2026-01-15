// E-Grampanchayat - App Logic using Firebase Compat SDKs
// NOTE: We attach public functions to window to keep them globally accessible for inline onclick handlers.

// 1) Firebase Init
// const firebaseConfig = {
//   apiKey: "AIzaSyA93T-iG5TXmchXRxESQAbYrUcLlO_zs70",
//   authDomain: "e-grampanchayt-d4c5c.firebaseapp.com",
//   projectId: "e-grampanchayt-d4c5c",
//   storageBucket: "e-grampanchayt-d4c5c.appspot.com",
//   messagingSenderId: "1050952036503",
//   appId: "1:1050952036503:web:faf1c82e483efffbaab9d2",
//   measurementId: "G-BPZWNVJ5NB",
// };

const firebaseConfig = {
  apiKey: "AIzaSyD533gnR4hyWn9mn4qhxX0Q4UnCASL3_9A",
  authDomain: "e-grampanchayt-848cb.firebaseapp.com",
  projectId: "e-grampanchayt-848cb",
  storageBucket: "e-grampanchayt-848cb.firebasestorage.app",
  messagingSenderId: "531741531658",
  appId: "1:531741531658:web:0fd103362b4af3883c49f3",
  measurementId: "G-P27YVPPYDM"

};

firebase.initializeApp(firebaseConfig);
try { firebase.analytics(); } catch (_) {}

function prettyDetails(app){
  const t = app.type;
  const d = app.details || {};
  if (t === 'birth'){
    return [
      ['Full Name of Child', d.childName],
      ['Date of Birth', d.dateOfBirth],
      ['Place of Birth', d.placeOfBirth],
      ['Gender', d.gender],
      ['Father’s Name', d.fatherName],
      ['Mother’s Name', d.motherName],
      ['Permanent Address', d.address],
      ['Parent/Guardian Aadhaar', d.parentAadhaar],
      ['Contact Number', d.contact],
    ];
  } else if (t === 'death'){
    return [
      ['Full Name of Deceased', d.deceasedName],
      ['Date of Death', d.dateOfDeath],
      ['Place of Death', d.placeOfDeath],
      ['Gender', d.gender],
      ['Father’s/Husband’s Name', d.fatherHusbandName],
      ['Address of Deceased', d.address],
      ['Aadhaar Number', d.aadhaar],
      ['Cause of Death', d.causeOfDeath],
      ['Informant’s Name', d.informantName],
      ['Informant’s Contact Number', d.informantContact],
    ];
  } else if (t === 'residence'){
    return [
      ['Applicant’s Full Name', d.applicantName],
      ['Father’s/Mother’s Name', d.parentName],
      ['Permanent Address', d.address],
      ['Aadhaar Number', d.aadhaar],
      ['Duration of Stay in Village', d.durationStay],
      ['Contact Number', d.contact],
    ];
  }
  // Fallback generic listing
  return Object.keys(d).map(k=>[k, d[k]]);
}
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Admin configuration: add the email(s) that should be treated as admins.
// Edit this list to your desired admin usernames (emails). When a user with one of these
// emails registers or logs in, their Firestore role will be set to 'admin'.
const ADMIN_EMAILS = [
  'sarpanch@example.com',
  // 'youremail@domain.com',
];

// Default Admin (for development/demo). Change these to your preferred defaults.
const ADMIN_DEFAULT_EMAIL = 'admin@egram.com';
const ADMIN_DEFAULT_PASSWORD = 'Admin@123';
if (!ADMIN_EMAILS.includes(ADMIN_DEFAULT_EMAIL)) {
  ADMIN_EMAILS.push(ADMIN_DEFAULT_EMAIL);
}

// 2) DOM Refs
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const homeSection = document.getElementById('homeSection');
const committeeSection = document.getElementById('committeeSection');
const dashboardSection = document.getElementById('dashboardSection');
const adminSection = document.getElementById('adminSection');
const dashboardTab = document.getElementById('dashboardTab');
const adminTab = document.getElementById('adminTab');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const welcomeText = document.getElementById('welcomeText');

// Lists / containers
const notificationsList = document.getElementById('notificationsList');
const noNotifications = document.getElementById('noNotifications');
const committeeList = document.getElementById('committeeList');
const noCommittee = document.getElementById('noCommittee');
const myApplications = document.getElementById('myApplications');
const noApplications = document.getElementById('noApplications');
const pendingApplications = document.getElementById('pendingApplications');
const noPending = document.getElementById('noPending');

// Forms
const certificateType = document.getElementById('certificateType');
const notifTitle = document.getElementById('notifTitle');
const notifMessage = document.getElementById('notifMessage');
const memberName = document.getElementById('memberName');
const memberRole = document.getElementById('memberRole');
const memberPhoto = document.getElementById('memberPhoto');

// Modals
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const viewModal = document.getElementById('viewModal');

// State
let currentUser = null; // firebase.User
let currentRole = 'guest'; // 'guest' | 'user' | 'admin'
let unsubNotifications = null;
let unsubCommittee = null;
let unsubMyApplications = null;
let unsubPending = null;

// 3) Helpers
function showSection(sectionId){
  [homeSection, committeeSection, dashboardSection, adminSection].forEach(sec=>{
    if (!sec) return;
    if (sec.id === sectionId) sec.classList.add('active');
    else sec.classList.remove('active');
  });
}

function setAuthUI(){
  if (currentUser){
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    if (adminLoginBtn) adminLoginBtn.style.display = 'none';
    dashboardTab.style.display = 'inline-block';
    welcomeText.textContent = `Welcome, ${currentUser.displayName || currentUser.email}`;
    if (currentRole === 'admin'){
      adminTab.style.display = 'inline-block';
    } else {
      adminTab.style.display = 'none';
      // If we are currently on admin section and lost admin role, move away
      if (adminSection.classList.contains('active')) showSection('homeSection');
    }
  } else {
    loginBtn.style.display = 'inline-block';
    registerBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    if (adminLoginBtn) adminLoginBtn.style.display = 'inline-block';
    dashboardTab.style.display = 'none';
    adminTab.style.display = 'none';
    welcomeText.textContent = '';
    // Default to home
    showSection('homeSection');
  }
}

function clearListeners(){
  if (unsubNotifications) { unsubNotifications(); unsubNotifications = null; }
  if (unsubCommittee) { unsubCommittee(); unsubCommittee = null; }
  if (unsubMyApplications) { unsubMyApplications(); unsubMyApplications = null; }
  if (unsubPending) { unsubPending(); unsubPending = null; }
}

function requireAdmin(){
  if (currentRole !== 'admin'){
    alert('Admin permission required.');
    return false;
  }
  return true;
}

// 4) Navigation (attach to window for inline handlers)
function showHome(){ showSection('homeSection'); }
function showCommittee(){ showSection('committeeSection'); }
function showDashboard(){
  if (!currentUser){ alert('Please login first.'); return; }
  showSection('dashboardSection');
}
function showAdminTab(){
  if (!requireAdmin()) return;
  showSection('adminSection');
}

// 5) Auth Modals
function showLoginModal(asAdmin = false){
  if (loginModal){
    loginModal.style.display = 'grid';
    const cb = document.getElementById('loginAsAdmin');
    if (cb) cb.checked = !!asAdmin;
    const emailInput = document.getElementById('loginEmail');
    if (emailInput) setTimeout(()=> emailInput.focus(), 0);
  }
}
function showRegisterModal(){ if (registerModal) registerModal.style.display = 'grid'; }
function closeModal(id){ const el = document.getElementById(id); if (el) el.style.display='none'; }

// Global modal UX: click outside and Esc to close
window.addEventListener('click', (e)=>{
  [loginModal, registerModal, viewModal].forEach(m=>{
    if (m && e.target === m) m.style.display = 'none';
  });
});
window.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape'){
    [loginModal, registerModal, viewModal].forEach(m=>{
      if (m && m.style.display === 'grid') m.style.display = 'none';
    });
  }
});

// Certificate type field toggling
function showCertificateFields(){
  const typeSel = document.getElementById('certificateType');
  const type = typeSel?.value || 'birth';
  const birth = document.getElementById('birthFields');
  const death = document.getElementById('deathFields');
  const residence = document.getElementById('residenceFields');
  if (birth) birth.style.display = (type === 'birth') ? 'block' : 'none';
  if (death) death.style.display = (type === 'death') ? 'block' : 'none';
  if (residence) residence.style.display = (type === 'residence') ? 'block' : 'none';
}

// 6) Auth Actions
async function register(){
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  if (!name || !email || !password){ alert('Please fill all fields.'); return; }
  try{
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });
    // Create user profile in Firestore with default role 'user'
    const baseData = {
      uid: cred.user.uid,
      name,
      email,
      role: ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('users').doc(cred.user.uid).set(baseData, { merge: true });
    closeModal('registerModal');
  }catch(err){
    console.error(err); alert(err.message || 'Registration failed');
  }
}

async function login(){
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const adminRequired = !!document.getElementById('loginAsAdmin')?.checked;
  if (!email || !password){ alert('Enter email and password.'); return; }
  try{
    await auth.signInWithEmailAndPassword(email, password);
    // If email is whitelisted as admin, ensure Firestore role is updated
    try{
      if (ADMIN_EMAILS.includes(email.toLowerCase())){
        const uid = auth.currentUser?.uid;
        if (uid){
          await db.collection('users').doc(uid).set({ role: 'admin' }, { merge: true });
        }
      }
    } catch (_) {}
    if (adminRequired){
      const uid = auth.currentUser?.uid;
      if (!uid){ throw new Error('Login failed'); }
      const snap = await db.collection('users').doc(uid).get();
      const role = snap.exists ? (snap.data().role || 'user') : 'user';
      if (role !== 'admin'){
        alert('This account is not an admin. Please use a valid admin account or contact the Sarpanch.');
        await auth.signOut();
        return; // keep modal open
      }
    }
    closeModal('loginModal');
  }catch(err){ console.error(err); alert(err.message || 'Login failed'); }
}

function logout(){ auth.signOut(); }

// 7) Firestore Listeners and Rendering
function listenNotifications(){
  if (unsubNotifications) unsubNotifications();
  unsubNotifications = db.collection('notifications').orderBy('createdAt','desc').onSnapshot(snap=>{
    const docs = [];
    snap.forEach(d=>docs.push({ id:d.id, ...d.data() }));
    renderNotifications(docs);
  }, console.error);
}

function renderNotifications(items){
  notificationsList.innerHTML = '';
  if (!items.length){ noNotifications.style.display = 'block'; return; }
  noNotifications.style.display = 'none';
  items.forEach(n=>{
    const card = document.createElement('div');
    card.className = 'card';
    const date = n.createdAt?.toDate ? n.createdAt.toDate() : new Date();
    const canDelete = (currentRole === 'admin');
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem">
        <div>
          <h3 style="margin:0">${escapeHtml(n.title || 'Untitled')}</h3>
          <p class="muted" style="margin:0.25rem 0">${date.toLocaleString()}</p>
        </div>
        ${canDelete ? `<button class="danger" onclick="deleteNotification('${n.id}')">Delete</button>` : ''}
      </div>
      <p style="margin-top:0.5rem">${escapeHtml(n.message || '')}</p>
    `;
    notificationsList.appendChild(card);
  });
}

function listenCommittee(){
  if (unsubCommittee) unsubCommittee();
  unsubCommittee = db.collection('committee').orderBy('name').onSnapshot(snap=>{
    const items=[]; snap.forEach(d=>items.push({ id:d.id, ...d.data() }));
    renderCommittee(items);
  }, console.error);
}

function renderCommittee(items){
  committeeList.innerHTML = '';
  if (!items.length){ noCommittee.style.display = 'block'; return; }
  noCommittee.style.display = 'none';
  items.forEach(m=>{
    const card = document.createElement('div');
    card.className='card';
    const canDelete = (currentRole === 'admin');
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem">
        <div style="display:flex;gap:0.75rem;align-items:center">
          <img src="${m.photoUrl || 'https://via.placeholder.com/64'}" alt="photo" style="width:64px;height:64px;border-radius:8px;object-fit:cover;border:1px solid var(--border)"/>
          <div>
            <h3 style="margin:0">${escapeHtml(m.name || '')}</h3>
            <p class="muted" style="margin:0">${escapeHtml(m.role || '')}</p>
          </div>
        </div>
        ${canDelete ? `<button class="danger" onclick="deleteCommitteeMember('${m.id}')">Delete</button>` : ''}
      </div>
    `;
    committeeList.appendChild(card);
  });
}

function listenMyApplications(){
  if (!currentUser) return;
  if (unsubMyApplications) unsubMyApplications();
  // Remove orderBy to avoid composite index; we'll sort client-side
  unsubMyApplications = db.collection('certificates')
    .where('userId','==', currentUser.uid)
    .onSnapshot(snap=>{
      const items=[]; snap.forEach(d=>items.push({ id:d.id, ...d.data() }));
      items.sort((a,b)=>{
        const da = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dbm = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dbm - da;
      });
      renderMyApplications(items);
    }, console.error);
}

function renderMyApplications(items){
  myApplications.innerHTML = '';
  if (!items.length){ noApplications.style.display = 'block'; return; }
  noApplications.style.display = 'none';
  items.forEach(app=>{
    const row = document.createElement('div');
    row.className = 'list-item';
    const date = app.createdAt?.toDate ? app.createdAt.toDate() : new Date();
    row.innerHTML = `
      <div>
        <div><strong>${prettyType(app.type)}</strong></div>
        <div class="muted" style="font-size:0.9rem">${date.toLocaleString()}</div>
      </div>
      <span class="badge ${app.status}">${app.status}</span>
    `;
    myApplications.appendChild(row);
  });
}

function listenPendingApplications(){
  if (unsubPending) unsubPending();
  // Remove orderBy to avoid composite index; we'll sort client-side
  unsubPending = db.collection('certificates')
    .where('status','==','pending')
    .onSnapshot(snap=>{
      const items=[]; snap.forEach(d=>items.push({ id:d.id, ...d.data() }));
      items.sort((a,b)=>{
        const da = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dbm = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dbm - da;
      });
      renderPending(items);
    }, console.error);
}

function renderPending(items){
  pendingApplications.innerHTML = '';
  if (!items.length){ noPending.style.display = 'block'; return; }
  noPending.style.display = 'none';
  items.forEach(app=>{
    const row = document.createElement('div');
    row.className = 'list-item';
    // Derive a display name from details
    let displayName = '';
    if (app.type === 'birth') displayName = app.details?.childName || '';
    else if (app.type === 'death') displayName = app.details?.deceasedName || '';
    else if (app.type === 'residence') displayName = app.details?.applicantName || '';
    row.innerHTML = `
      <div>
        <div><strong>${prettyType(app.type)}</strong></div>
        <div class="muted" style="font-size:0.9rem">
          ${escapeHtml(displayName)}
        </div>
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:flex-end">
        <button class="secondary" onclick="viewApplication('${app.id}')">View</button>
        <button class="primary" onclick="updateApplicationStatus('${app.id}','approved')">Approve</button>
        <button class="danger" onclick="updateApplicationStatus('${app.id}','rejected')">Reject</button>
      </div>
    `;
    pendingApplications.appendChild(row);
  });
}

// 8) Actions
async function applyCertificate(){
  if (!currentUser){ alert('Please login.'); return; }
  const type = certificateType.value;
  // Collect per-type details
  let details = {};
  if (type === 'birth'){
    details = {
      childName: document.getElementById('childName')?.value?.trim() || '',
      dateOfBirth: document.getElementById('dob')?.value || '',
      placeOfBirth: document.getElementById('birthPlace')?.value?.trim() || '',
      gender: document.getElementById('birthGender')?.value || '',
      fatherName: document.getElementById('fatherName')?.value?.trim() || '',
      motherName: document.getElementById('motherName')?.value?.trim() || '',
      address: document.getElementById('birthAddress')?.value?.trim() || '',
      parentAadhaar: document.getElementById('parentAadhaar')?.value?.trim() || '',
      contact: document.getElementById('birthContact')?.value?.trim() || '',
    };
    if (!details.childName || !details.dateOfBirth){
      alert('Please provide Child Name and Date of Birth.'); return;
    }
  } else if (type === 'death'){
    details = {
      deceasedName: document.getElementById('deceasedName')?.value?.trim() || '',
      dateOfDeath: document.getElementById('dod')?.value || '',
      placeOfDeath: document.getElementById('deathPlace')?.value?.trim() || '',
      gender: document.getElementById('deathGender')?.value || '',
      fatherHusbandName: document.getElementById('fatherHusbandName')?.value?.trim() || '',
      address: document.getElementById('deceasedAddress')?.value?.trim() || '',
      aadhaar: document.getElementById('aadhaarDeath')?.value?.trim() || '',
      causeOfDeath: document.getElementById('causeOfDeath')?.value?.trim() || '',
      informantName: document.getElementById('informantName')?.value?.trim() || '',
      informantContact: document.getElementById('informantContact')?.value?.trim() || '',
    };
    if (!details.deceasedName || !details.dateOfDeath){
      alert('Please provide Deceased Name and Date of Death.'); return;
    }
  } else if (type === 'residence'){
    details = {
      applicantName: document.getElementById('applicantName')?.value?.trim() || '',
      parentName: document.getElementById('parentName')?.value?.trim() || '',
      address: document.getElementById('resPermanentAddress')?.value?.trim() || '',
      aadhaar: document.getElementById('aadhaarResidence')?.value?.trim() || '',
      durationStay: document.getElementById('durationStay')?.value?.trim() || '',
      contact: document.getElementById('resContact')?.value?.trim() || '',
    };
    if (!details.applicantName || !details.address){
      alert('Please provide Applicant Name and Permanent Address.'); return;
    }
  }
  try{
    await db.collection('certificates').add({
      type,
      userId: currentUser.uid,
      status: 'pending',
      details,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    alert('Application submitted.');
    // Reset form: set type to birth and clear all fields
    certificateType.value = 'birth';
    showCertificateFields();
    // Birth fields
    ['childName','dob','birthPlace','birthGender','fatherName','motherName','birthAddress','parentAadhaar','birthContact'].forEach(id=>{
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
    // Death fields
    ['deceasedName','dod','deathPlace','deathGender','fatherHusbandName','deceasedAddress','aadhaarDeath','causeOfDeath','informantName','informantContact'].forEach(id=>{
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
    // Residence fields
    ['applicantName','parentName','resPermanentAddress','aadhaarResidence','durationStay','resContact'].forEach(id=>{
      const el = document.getElementById(id);
      if (!el) return;
      el.value = '';
    });
  }catch(err){ console.error(err); alert('Failed to submit.'); }
}

async function addNotification(){
  if (!requireAdmin()) return;
  const title = notifTitle.value.trim();
  const message = notifMessage.value.trim();
  if (!title || !message){ alert('Enter title and message.'); return; }
  try{
    await db.collection('notifications').add({
      title, message,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    notifTitle.value = '';
    notifMessage.value = '';
  }catch(err){ console.error(err); alert('Failed to post notification'); }
}

async function addCommitteeMember(){
  if (!requireAdmin()) return;
  const name = memberName.value.trim();
  const role = memberRole.value.trim();
  const urlInput = document.getElementById('memberPhotoUrl');
  const customUrl = (urlInput?.value || '').trim();
  const file = memberPhoto.files[0];
  if (!name || !role){ alert('Name and role are required.'); return; }
  try{
    let photoUrl = '';
    if (customUrl){
      // Use provided direct URL (e.g., hosted image or CDN)
      photoUrl = customUrl;
    } else if (file){
      // Fallback: store as Data URL directly in Firestore (no Firebase Storage required)
      // Keep small to stay under Firestore 1 MiB doc limit; we guard to 200KB here.
      if (file.size > 200 * 1024){
        alert('Selected image is too large. Please choose an image under 200KB or provide a Photo URL.');
        return;
      }
      photoUrl = await readFileAsDataUrl(file);
    }
    await db.collection('committee').add({ name, role, photoUrl });
    memberName.value = '';
    memberRole.value = '';
    if (urlInput) urlInput.value = '';
    if (memberPhoto) memberPhoto.value = '';
  }catch(err){ console.error(err); alert('Failed to add member'); }
}

async function updateApplicationStatus(id, status){
  if (!requireAdmin()) return;
  try{
    await db.collection('certificates').doc(id).update({ status });
  }catch(err){ console.error(err); alert('Failed to update'); }
}

// Admin: View application details in modal
async function viewApplication(id){
  if (!requireAdmin()) return;
  try{
    const snap = await db.collection('certificates').doc(id).get();
    if (!snap.exists){ alert('Application not found'); return; }
    const data = snap.data() || {};
    const viewBody = document.getElementById('viewBody');
    if (viewBody){
      viewBody.innerHTML = '';
      const addLine = (label, value)=>{
        const row = document.createElement('div');
        row.className = 'list-item';
        row.innerHTML = `<strong>${escapeHtml(label)}</strong><span class="muted">${escapeHtml(String(value || ''))}</span>`;
        viewBody.appendChild(row);
      };
      addLine('Type', prettyType(data.type));
      addLine('Status', data.status);
      addLine('User ID', data.userId);
      const lines = prettyDetails(data);
      lines.forEach(([k,v])=> addLine(k, v));
      const modal = document.getElementById('viewModal');
      if (modal){
        modal.style.display = 'grid';
        // Ensure modal starts at top
        const content = modal.querySelector('.modal-content');
        if (content) content.scrollTop = 0;
      }
    }
  }catch(err){ console.error(err); alert('Failed to load details'); }
}

// Admin: Delete actions
async function deleteNotification(id){
  if (!requireAdmin()) return;
  if (!confirm('Delete this notification?')) return;
  try{
    await db.collection('notifications').doc(id).delete();
  }catch(err){ console.error(err); alert('Failed to delete notification'); }
}

async function deleteCommitteeMember(id){
  if (!requireAdmin()) return;
  if (!confirm('Delete this committee member?')) return;
  try{
    await db.collection('committee').doc(id).delete();
  }catch(err){ console.error(err); alert('Failed to delete member'); }
}

// 9) Utilities
function prettyType(t){
  if (t === 'birth') return 'Birth Certificate';
  if (t === 'death') return 'Death Certificate';
  if (t === 'residence') return 'Residence Certificate';
  return t || 'Certificate';
}
function escapeHtml(s){
  return String(s).replace(/[&<>\"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
}

function readFileAsDataUrl(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 10) Auth state bootstrap
auth.onAuthStateChanged(async (user)=>{
  clearListeners();
  currentUser = user;
  currentRole = 'guest';
  if (user){
    // Ensure user doc exists, get role
    const docRef = db.collection('users').doc(user.uid);
    const snap = await docRef.get();
    if (!snap.exists){
      await docRef.set({
        uid: user.uid,
        name: user.displayName || '',
        email: user.email || '',
        role: 'user',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      currentRole = 'user';
    } else {
      const data = snap.data() || {}; currentRole = data.role || 'user';
    }
  }
  setAuthUI();
  // Public listeners
  listenNotifications();
  listenCommittee();
  // User-specific
  if (currentUser){ listenMyApplications(); }
  // Admin-specific
  if (currentRole === 'admin'){ listenPendingApplications(); }
});

// 11) Expose globals for inline handlers
window.showHome = showHome;
window.showCommittee = showCommittee;
window.showDashboard = showDashboard;
window.showAdminTab = showAdminTab;
window.showCertificateFields = showCertificateFields;
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;
window.closeModal = closeModal;
window.register = register;
window.login = login;
window.logout = logout;
window.applyCertificate = applyCertificate;
window.addNotification = addNotification;
window.addCommitteeMember = addCommitteeMember;
window.updateApplicationStatus = updateApplicationStatus;

// 12) Default admin seeding (dev helper)
async function seedDefaultAdmin(){
  try{
    // Try to create admin user; if exists, sign in instead
    let userCred;
    try {
      userCred = await auth.createUserWithEmailAndPassword(ADMIN_DEFAULT_EMAIL, ADMIN_DEFAULT_PASSWORD);
      await userCred.user.updateProfile({ displayName: 'Sarpanch' });
    } catch (err){
      if (err && err.code === 'auth/operation-not-allowed'){
        alert('Email/Password sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method.');
        return;
      }
      if (err && err.code === 'auth/email-already-in-use'){
        userCred = await auth.signInWithEmailAndPassword(ADMIN_DEFAULT_EMAIL, ADMIN_DEFAULT_PASSWORD);
      } else {
        throw err;
      }
    }
    const uid = userCred.user.uid;
    await db.collection('users').doc(uid).set({
      uid,
      name: userCred.user.displayName || 'Sarpanch',
      email: ADMIN_DEFAULT_EMAIL,
      role: 'admin',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    alert('Default admin is ready and signed in. You can now use the Admin tab.');
    closeModal('loginModal');
  }catch(err){
    console.error(err);
    alert(err.message || 'Failed to seed default admin');
  }
}
window.seedDefaultAdmin = seedDefaultAdmin;
