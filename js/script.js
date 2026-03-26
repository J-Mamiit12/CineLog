/* ============================================================
   CineLog — script.js
   Main application logic for index.html (Watchlist page)
   ITEL 203 Group Performance Task #1
   ============================================================ */

/* ── STATE ─────────────────────────────────────────────────── */
let movies = JSON.parse(localStorage.getItem('cinelog_movies') || '[]');

let currentFilter  = 'all';
let currentSearch  = '';
let sortCol        = '';
let sortDir        = 1;
let selectedRating = 0;

/* Holds a fully-built movie object while the duplicate modal is open */
let pendingMovie = null;

/* ── PERSISTENCE ────────────────────────────────────────────── */
const saveMovies = () =>
  localStorage.setItem('cinelog_movies', JSON.stringify(movies));

const $ = id => document.getElementById(id);

/* ── TOAST NOTIFICATIONS ────────────────────────────────────── */
function showToast(message, type = 'success') {
  const container = $('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

/* ── STATS COUNTER ANIMATION ────────────────────────────────── */
function bumpStat(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 220);
}

/* ── STATS BAR ──────────────────────────────────────────────── */
function updateStats() {
  const total    = movies.filter(m => m.status !== 'deleted').length;
  const watched  = movies.filter(m => m.status === 'watched').length;
  const watching = movies.filter(m => m.status === 'watching').length;
  const plan     = movies.filter(m => m.status === 'plan').length;
  const rated    = movies.filter(m => m.rating > 0);
  const avg      = rated.length
    ? (rated.reduce((s, m) => s + m.rating, 0) / rated.length).toFixed(1) + '★'
    : '—';

  const els = { 'stat-total': total, 'stat-watched': watched, 'stat-watching': watching, 'stat-plan': plan };
  Object.entries(els).forEach(([id, val]) => {
    const el = $(id);
    if (el && el.textContent !== String(val)) { el.textContent = val; bumpStat(id); }
  });
  $('stat-avg').textContent = avg;
}

/* ── STAR RATING INPUT ──────────────────────────────────────── */
const allStars  = document.querySelectorAll('#star-group .star-btn');
const starGroup = $('star-group');
const lockMsg   = $('rating-lock-msg');

function refreshStars() {
  allStars.forEach(s => s.classList.toggle('active', +s.dataset.val <= selectedRating));
}

function setRatingLock(isLocked) {
  if (isLocked) {
    starGroup.classList.add('disabled');
    lockMsg.classList.add('show');
    selectedRating = 0; refreshStars(); $('rating').value = 0;
  } else {
    starGroup.classList.remove('disabled');
    lockMsg.classList.remove('show');
  }
}

allStars.forEach(btn => {
  btn.addEventListener('mouseenter', () => {
    if (starGroup.classList.contains('disabled')) return;
    const val = +btn.dataset.val;
    allStars.forEach(s => s.classList.toggle('active', +s.dataset.val <= val));
  });
  btn.addEventListener('mouseleave', () => refreshStars());
  btn.addEventListener('click', () => {
    if (starGroup.classList.contains('disabled')) return;
    selectedRating = +btn.dataset.val; $('rating').value = selectedRating; refreshStars();
  });
});

$('status').addEventListener('change', function () { setRatingLock(this.value !== 'watched'); });
setRatingLock(true);

/* ── CUSTOM GENRE INPUT ─────────────────────────────────────── */
const genreSelect      = document.getElementById('genre');
const customGenreGroup = document.getElementById('customGenreGroup');
const customGenreInput = document.getElementById('customGenre');

if (genreSelect && customGenreGroup) {
  genreSelect.addEventListener('change', (e) => {
    if (e.target.value.toLowerCase() === 'other') {
      customGenreGroup.style.display = 'block';
      customGenreInput.required = true;
    } else {
      customGenreGroup.style.display = 'none';
      customGenreInput.required = false;
      customGenreInput.value = '';
    }
  });
}

/* ── FORM VALIDATION ────────────────────────────────────────── */
function setFieldState(inputId, errId, isError) {
  const input = $(inputId), errEl = $(errId);
  if (!input || !errEl) return;
  input.classList.toggle('is-error', isError);
  input.classList.toggle('is-valid', !isError && input.value.trim() !== '');
  errEl.classList.toggle('show', isError);
}

function validateForm() {
  let isValid = true;
  const title   = $('movieTitle').value.trim();
  const yearVal = $('releaseYear').value;
  const year    = Number(yearVal);
  const dur     = $('duration').value;
  const director = $('director').value.trim();
  const status  = $('status').value;
  const notes   = $('notes').value.trim();
  let genre     = $('genre').value;
  if (genre.toLowerCase() === 'other') genre = $('customGenre').value.trim();

  if (!title)  { setFieldState('movieTitle',  'err-title',    true);  isValid = false; } else setFieldState('movieTitle',  'err-title',    false);
  if (!yearVal || year < 1888 || year > 2030) { setFieldState('releaseYear', 'err-year', true); isValid = false; } else setFieldState('releaseYear', 'err-year', false);
  if (dur !== '' && (isNaN(Number(dur)) || Number(dur) < 1 || Number(dur) > 600)) { setFieldState('duration', 'err-duration', true); isValid = false; } else setFieldState('duration', 'err-duration', false);
  if (director && /\d/.test(director)) { setFieldState('director', 'err-director', true); isValid = false; } else setFieldState('director', 'err-director', false);
  if (!genre)  { setFieldState('genre',  'err-genre',  true);  isValid = false; } else setFieldState('genre',  'err-genre',  false);
  if (!status) { setFieldState('status', 'err-status', true);  isValid = false; } else setFieldState('status', 'err-status', false);
  if (notes.length > 300) { setFieldState('notes', 'err-notes', true); isValid = false; } else setFieldState('notes', 'err-notes', false);
  return isValid;
}

['movieTitle','releaseYear','duration','director','genre','customGenre','status','notes'].forEach(id => {
  const el = $(id); if (!el) return;
  el.addEventListener('input', validateForm);
  el.addEventListener('change', validateForm);
});

/* ── FORM RESET HELPER ──────────────────────────────────────── */
/* Restore the form to its initial empty state after a successful add */
function resetFormState() {
  $('movie-form').reset();
  if (customGenreGroup) customGenreGroup.style.display = 'none';
  selectedRating = 0; $('rating').value = 0;
  refreshStars(); setRatingLock(true);
  ['movieTitle','releaseYear','duration','director','genre','customGenre','status','notes'].forEach(id => {
    const el = $(id); if (el) el.classList.remove('is-error','is-valid');
  });
  document.querySelectorAll('.error-msg').forEach(el => el.classList.remove('show'));
}

/* ── FINALIZE ADD MOVIE ─────────────────────────────────────── */
/* Commit the movie to storage and refresh all UI.
   Called from the normal submit path and from "Add Anyway" in the duplicate modal. */
function finalizeAddMovie(movie) {
  movies.unshift(movie);
  saveMovies();
  renderTable();
  updateStats();
  showToast(`"${movie.title}" added to your watchlist!`);
  resetFormState();
}

/* ── DUPLICATE DETECTION ────────────────────────────────────── */
/* Returns the first non-deleted movie whose title matches (case-insensitive) */
function findDuplicate(title) {
  return movies.find(m =>
    m.title.toLowerCase() === title.toLowerCase() && m.status !== 'deleted'
  ) || null;
}

/* Populate the duplicate-warning modal with details of the conflicting movie */
function showDuplicateModal(existing) {
  $('dupMovieTitle').textContent = `"${existing.title}"`;

  /* Build a small summary card showing what the user already has */
  const [badgeClass, badgeLabel] = STATUS_MAP[existing.status] || ['badge-plan', existing.status];
  $('dupExistingInfo').innerHTML = `
    <div style="font-weight:600;color:var(--text-primary);margin-bottom:0.5rem;">
      ${existing.title} <span style="color:var(--text-muted);font-weight:400;">(${existing.year})</span>
    </div>
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;margin-bottom:0.5rem;">
      <span class="badge ${badgeClass}">${badgeLabel}</span>
      <span class="genre-pill">${existing.genre}</span>
    </div>
    <div style="color:var(--text-secondary);font-size:0.8rem;line-height:1.6;">
      ${existing.director !== '—' ? `<div>Director: ${existing.director}</div>` : ''}
      <div>${buildStarsHTML(existing.rating)}</div>
    </div>`;
  $('duplicateModal').classList.add('active');
}

/* "Add Anyway" — user acknowledges the duplicate and proceeds */
$('btnDupAddAnyway').addEventListener('click', () => {
  if (pendingMovie) { finalizeAddMovie(pendingMovie); pendingMovie = null; }
  $('duplicateModal').classList.remove('active');
});

/* "Cancel" — discard the pending movie and dismiss the modal */
$('btnDupCancel').addEventListener('click', () => {
  pendingMovie = null;
  $('duplicateModal').classList.remove('active');
});

/* (×) close button on the duplicate modal */
document.querySelector('.close-duplicate-modal').addEventListener('click', () => {
  pendingMovie = null; $('duplicateModal').classList.remove('active');
});

/* Backdrop click closes the duplicate modal */
window.addEventListener('click', (e) => {
  if (e.target === $('duplicateModal')) { pendingMovie = null; $('duplicateModal').classList.remove('active'); }
});

/* ── FORM SUBMISSION ────────────────────────────────────────── */
$('movie-form').addEventListener('submit', function (e) {
  e.preventDefault();
  if (!validateForm()) { showToast('Please fix the errors before adding.', 'error'); return; }

  let finalGenre = $('genre').value;
  if (finalGenre.toLowerCase() === 'other') finalGenre = $('customGenre').value.trim();

  const movie = {
    id:       Date.now(),
    title:    $('movieTitle').value.trim(),
    year:     Number($('releaseYear').value),
    duration: $('duration').value ? Number($('duration').value) : null,
    director: $('director').value.trim() || '—',
    genre:    finalGenre,
    status:   $('status').value,
    rating:   selectedRating,
    notes:    $('notes').value.trim(),
  };

  /* ── Duplicate check: pause if a matching movie already exists ── */
  const duplicate = findDuplicate(movie.title);
  if (duplicate) {
    pendingMovie = movie;   /* Save for "Add Anyway" */
    showDuplicateModal(duplicate);
    return;
  }

  finalizeAddMovie(movie);
});

/* ── DELETE MOVIE ───────────────────────────────────────────── */
function deleteMovie(id) {
  const target = movies.find(m => m.id === id);
  if (!target) return;
  if (target.status === 'deleted') {
    movies = movies.filter(m => m.id !== id);
    showToast(`"${target.title}" permanently deleted.`, 'error');
  } else {
    target.status = 'deleted';
    showToast(`"${target.title}" moved to History.`, 'error');
  }
  saveMovies(); renderTable(); updateStats();
}
window.deleteMovie = deleteMovie;

/* ── STAR HTML BUILDER ──────────────────────────────────────── */
function buildStarsHTML(n) {
  if (!n) return '<span style="color:var(--text-muted);font-size:0.72rem;">—</span>';
  let html = '<span class="stars-display">';
  for (let i = 1; i <= 5; i++) html += i <= n ? '★' : '<span class="empty">★</span>';
  return html + '</span>';
}

/* ── STATUS MAP ─────────────────────────────────────────────── */
const STATUS_MAP = {
  watched:  ['badge-watched',  '✓ Watched'],
  watching: ['badge-watching', '▶ Watching'],
  plan:     ['badge-plan',     '◷ Plan to Watch'],
  dropped:  ['badge-dropped',  '✕ Dropped'],
  deleted:  ['badge-deleted',  '🗑 Deleted'],
};

/* ── FILTER & SORT DATA ─────────────────────────────────────── */
function getDisplayData() {
  return movies
    .filter(m => {
      const matchFilter = currentFilter === 'all' ? m.status !== 'deleted' : m.status === currentFilter;
      const q = currentSearch.toLowerCase();
      const matchSearch = !q || m.title.toLowerCase().includes(q)
        || m.genre.toLowerCase().includes(q) || m.director.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    })
    .sort((a, b) => {
      if (!sortCol) return 0;
      let av = a[sortCol], bv = b[sortCol];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return -1 * sortDir;
      if (av > bv) return  1 * sortDir;
      return 0;
    });
}

/* ── TABLE RENDERER ─────────────────────────────────────────── */
function renderTable() {
  const tbody = $('movie-tbody'), emptyState = $('empty-state'), data = getDisplayData();
  if (!data.length) { tbody.innerHTML = ''; emptyState.style.display = ''; return; }
  emptyState.style.display = 'none';
  tbody.innerHTML = data.map((m, i) => {
    const [badgeClass, badgeLabel] = STATUS_MAP[m.status] || ['badge-plan', m.status];
    return `
      <tr data-id="${m.id}" class="clickable-row">
        <td class="row-num">${i + 1}</td>
        <td class="movie-title-cell">${m.title}
          <small>${m.director !== '—' ? m.director : ''}${m.duration ? ` · ${m.duration}m` : ''}</small>
        </td>
        <td><span class="genre-pill">${m.genre}</span></td>
        <td style="color:var(--text-secondary);">${m.year}</td>
        <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
        <td>${buildStarsHTML(m.rating)}</td>
        <td><button class="btn-delete" onclick="deleteMovie(${m.id})" title="Remove '${m.title}'">✕</button></td>
      </tr>`;
  }).join('');
}

/* ── FILTER TABS ────────────────────────────────────────────── */
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    currentFilter = tab.dataset.filter;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderTable();
  });
});

/* ── LIVE SEARCH ────────────────────────────────────────────── */
$('searchInput').addEventListener('input', function () { currentSearch = this.value; renderTable(); });

/* ── COLUMN SORTING ─────────────────────────────────────────── */
document.querySelectorAll('th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    if (sortCol === th.dataset.col) sortDir *= -1;
    else { sortCol = th.dataset.col; sortDir = 1; }
    renderTable();
  });
});

/* ── NOTES MODAL ────────────────────────────────────────────── */
const modal         = document.getElementById('notesModal');
const closeModalBtn = document.querySelector('.close-modal');
const mTitle    = document.getElementById('modalMovieTitle');
const mStatus   = document.getElementById('modalMovieStatus');
const mYear     = document.getElementById('modalMovieYear');
const mDuration = document.getElementById('modalMovieDuration');
const mGenre    = document.getElementById('modalMovieGenre');
const mDirector = document.getElementById('modalMovieDirector');
const mRating   = document.getElementById('modalMovieRating');
const mNotes    = document.getElementById('modalMovieNotes');

function openNotesModal(movie) {
  mTitle.textContent = movie.title;
  const [badgeClass, badgeLabel] = STATUS_MAP[movie.status] || ['badge-plan', movie.status];
  mStatus.className = `badge ${badgeClass}`; mStatus.textContent = badgeLabel;
  mYear.textContent = movie.year;
  mDuration.textContent = movie.duration ? `${movie.duration}m` : 'N/A';
  mGenre.textContent = movie.genre;
  mDirector.textContent = movie.director !== '—' ? movie.director : 'N/A';
  mRating.innerHTML = movie.status === 'watched'
    ? buildStarsHTML(movie.rating)
    : '<span style="color:#666;font-style:italic;">Not yet watched</span>';
  if (movie.notes && movie.notes.trim() !== '') {
    mNotes.textContent = movie.notes; mNotes.style.fontStyle = 'normal'; mNotes.style.color = '#ccc';
  } else {
    mNotes.textContent = 'No notes saved for this movie.'; mNotes.style.fontStyle = 'italic'; mNotes.style.color = '#666';
  }
  modal.classList.add('active');
}

closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
window.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

/* ── TABLE ROW CLICK DELEGATION ─────────────────────────────── */
$('movie-tbody').addEventListener('click', (e) => {
  if (e.target.closest('.btn-delete')) return;
  const row = e.target.closest('tr'); if (!row) return;
  const movie = movies.find(m => m.id === Number(row.dataset.id)); if (!movie) return;
  if (e.target.closest('.badge')) { openUpdateModal(movie); return; }
  openNotesModal(movie);
});

/* ── UPDATE STATUS MODAL ────────────────────────────────────── */
const updateModal    = document.getElementById('updateModal');
const closeUpdateBtn = document.querySelector('.close-update-modal');
const updTitle       = document.getElementById('updateMovieTitle');
const updId          = document.getElementById('updateMovieId');
const updStatus      = document.getElementById('updateStatus');
const updStarGroup   = document.getElementById('update-star-group');
const updLockMsg     = document.getElementById('update-rating-lock');
const updRatingInput = document.getElementById('updateRating');
const updStars       = document.querySelectorAll('.upd-star-btn');
const btnSaveUpdate  = document.getElementById('btnSaveUpdate');
let currentUpdRating = 0;

function refreshUpdStars() {
  updStars.forEach(s => s.classList.toggle('active', +s.dataset.val <= currentUpdRating));
}

function setUpdRatingLock(isLocked) {
  if (isLocked) {
    updStarGroup.classList.add('disabled'); updLockMsg.classList.add('show');
    currentUpdRating = 0; refreshUpdStars(); updRatingInput.value = 0;
  } else {
    updStarGroup.classList.remove('disabled'); updLockMsg.classList.remove('show');
  }
}

updStars.forEach(btn => {
  btn.addEventListener('mouseenter', () => {
    if (updStarGroup.classList.contains('disabled')) return;
    updStars.forEach(s => s.classList.toggle('active', +s.dataset.val <= +btn.dataset.val));
  });
  btn.addEventListener('mouseleave', refreshUpdStars);
  btn.addEventListener('click', () => {
    if (updStarGroup.classList.contains('disabled')) return;
    currentUpdRating = +btn.dataset.val; updRatingInput.value = currentUpdRating; refreshUpdStars();
  });
});

updStatus.addEventListener('change', function () { setUpdRatingLock(this.value !== 'watched'); });

function openUpdateModal(movie) {
  updTitle.textContent = movie.title;
  updId.value = movie.id;
  updStatus.value = movie.status;
  if (movie.status === 'watched') {
    setUpdRatingLock(false);
    currentUpdRating = movie.rating || 0; updRatingInput.value = currentUpdRating; refreshUpdStars();
  } else { setUpdRatingLock(true); }
  updateModal.classList.add('active');
}

closeUpdateBtn.addEventListener('click', () => updateModal.classList.remove('active'));
window.addEventListener('click', (e) => { if (e.target === updateModal) updateModal.classList.remove('active'); });

btnSaveUpdate.addEventListener('click', () => {
  const movieId = Number(updId.value), newStatus = updStatus.value, newRating = Number(updRatingInput.value);
  const movieIndex = movies.findIndex(m => m.id === movieId);
  if (movieIndex > -1) {
    movies[movieIndex].status = newStatus;
    movies[movieIndex].rating = newStatus === 'watched' ? newRating : 0;
    saveMovies(); renderTable(); updateStats();
    showToast(`"${movies[movieIndex].title}" status updated!`);
  }
  updateModal.classList.remove('active');
});

/* ── INITIALISE ─────────────────────────────────────────────── */
renderTable();
updateStats();