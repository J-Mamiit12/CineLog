/* ============================================================
   CineLog — script.js
   Main application logic for index.html (Watchlist page)
   ITEL 203 Group Performance Task #1
   ============================================================ */

let movies = JSON.parse(localStorage.getItem('cinelog_movies') || '[]');

let currentFilter = 'all';
let currentSearch = '';
let sortCol       = '';
let sortDir       = 1;          
let selectedRating = 0;         

const saveMovies = () =>
  localStorage.setItem('cinelog_movies', JSON.stringify(movies));

const $ = id => document.getElementById(id);


function showToast(message, type = 'success') {
  const container = $('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span>${type === 'success' ? '✅' : '❌'}</span>
    <span>${message}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}


function bumpStat(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove('bump');      
  void el.offsetWidth;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 220);
}


function updateStats() {
  const total    = movies.length;
  const watched  = movies.filter(m => m.status === 'watched').length;
  const watching = movies.filter(m => m.status === 'watching').length;
  const plan     = movies.filter(m => m.status === 'plan').length;
  const rated    = movies.filter(m => m.rating > 0);
  const avg      = rated.length
    ? (rated.reduce((s, m) => s + m.rating, 0) / rated.length).toFixed(1) + '★'
    : '—';

  const els = {
    'stat-total':    total,
    'stat-watched':  watched,
    'stat-watching': watching,
    'stat-plan':     plan,
  };

  Object.entries(els).forEach(([id, val]) => {
    const el = $(id);
    if (el && el.textContent !== String(val)) {
      el.textContent = val;
      bumpStat(id);
    }
  });

  $('stat-avg').textContent = avg;
}


const allStars   = document.querySelectorAll('.star-btn');
const starGroup  = $('star-group');
const lockMsg    = $('rating-lock-msg');


function refreshStars() {
  allStars.forEach(s =>
    s.classList.toggle('active', +s.dataset.val <= selectedRating)
  );
}


function setRatingLock(isLocked) {
  if (isLocked) {
    starGroup.classList.add('disabled');
    lockMsg.classList.add('show');
    selectedRating = 0;
    refreshStars();
    $('rating').value = 0;
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

  btn.addEventListener('mouseleave', () => {
    refreshStars(); 
  });

  btn.addEventListener('click', () => {
    if (starGroup.classList.contains('disabled')) return;
    selectedRating    = +btn.dataset.val;
    $('rating').value = selectedRating;
    refreshStars();
  });
});

$('status').addEventListener('change', function () {
  setRatingLock(this.value !== 'watched');
});

setRatingLock(true);


function setFieldState(inputId, errId, isError) {
  const input = $(inputId);
  const errEl = $(errId);
  if (!input || !errEl) return;

  input.classList.toggle('is-error', isError);
  input.classList.toggle('is-valid', !isError && input.value.trim() !== '');
  errEl.classList.toggle('show', isError);
}


function validateForm() {
  let isValid = true;

  const title    = $('movieTitle').value.trim();
  const yearVal  = $('releaseYear').value;
  const year     = Number(yearVal);
  const dur      = $('duration').value;
  const director = $('director').value.trim();
  const genre    = $('genre').value;
  const status   = $('status').value;
  const notes    = $('notes').value.trim();

  if (!title) { setFieldState('movieTitle', 'err-title', true); isValid = false; } else { setFieldState('movieTitle', 'err-title', false); }
  if (!yearVal || year < 1888 || year > 2030) { setFieldState('releaseYear', 'err-year', true); isValid = false; } else { setFieldState('releaseYear', 'err-year', false); }
  if (dur !== '' && (isNaN(Number(dur)) || Number(dur) < 1 || Number(dur) > 600)) { setFieldState('duration', 'err-duration', true); isValid = false; } else { setFieldState('duration', 'err-duration', false); }
  if (director && /\d/.test(director)) { setFieldState('director', 'err-director', true); isValid = false; } else { setFieldState('director', 'err-director', false); }
  if (!genre) { setFieldState('genre', 'err-genre', true); isValid = false; } else { setFieldState('genre', 'err-genre', false); }
  if (!status) { setFieldState('status', 'err-status', true); isValid = false; } else { setFieldState('status', 'err-status', false); }
  if (notes.length > 300) { setFieldState('notes', 'err-notes', true); isValid = false; } else { setFieldState('notes', 'err-notes', false); }

  return isValid;
}

['movieTitle', 'releaseYear', 'duration', 'director', 'genre', 'status', 'notes'].forEach(id => {
  const el = $(id);
  if (!el) return;
  el.addEventListener('input',  validateForm);
  el.addEventListener('change', validateForm);
});


$('movie-form').addEventListener('submit', function (e) {
  e.preventDefault(); 

  if (!validateForm()) {
    showToast('Please fix the errors before adding.', 'error');
    return;
  }

  const movie = {
    id:       Date.now(), 
    title:    $('movieTitle').value.trim(),
    year:     Number($('releaseYear').value),
    duration: $('duration').value ? Number($('duration').value) : null,
    director: $('director').value.trim() || '—',
    genre:    $('genre').value,
    status:   $('status').value,
    rating:   selectedRating,
    notes:    $('notes').value.trim(),
  };

  movies.unshift(movie);
  saveMovies();

  renderTable();
  updateStats();
  showToast(`"${movie.title}" added to your watchlist!`);

  this.reset();
  selectedRating    = 0;
  $('rating').value = 0;
  refreshStars();
  setRatingLock(true); 

  ['movieTitle', 'releaseYear', 'duration', 'director', 'genre', 'status', 'notes']
    .forEach(id => {
      const el = $(id);
      if (el) el.classList.remove('is-error', 'is-valid');
    });
  document.querySelectorAll('.error-msg').forEach(el => el.classList.remove('show'));
});


function deleteMovie(id) {
  const target = movies.find(m => m.id === id);
  if (!target) return;

  movies = movies.filter(m => m.id !== id);
  saveMovies();

  renderTable();
  updateStats();
  showToast(`"${target.title}" removed.`, 'error');
}
window.deleteMovie = deleteMovie;


function buildStarsHTML(n) {
  if (!n) return '<span style="color:var(--text-muted);font-size:0.72rem;">—</span>';
  let html = '<span class="stars-display">';
  for (let i = 1; i <= 5; i++) html += i <= n ? '★' : '<span class="empty">★</span>';
  return html + '</span>';
}

const STATUS_MAP = {
  watched:  ['badge-watched',  '✓ Watched'],
  watching: ['badge-watching', '▶ Watching'],
  plan:     ['badge-plan',     '◷ Plan to Watch'],
  dropped:  ['badge-dropped',  '✕ Dropped'],
};


function getDisplayData() {
  return movies
    .filter(m => {
      const matchFilter = currentFilter === 'all' || m.status === currentFilter;
      const q = currentSearch.toLowerCase();
      const matchSearch = !q
        || m.title.toLowerCase().includes(q)
        || m.genre.toLowerCase().includes(q)
        || m.director.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    })
    .sort((a, b) => {
      if (!sortCol) return 0;
      let av = a[sortCol];
      let bv = b[sortCol];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return -1 * sortDir;
      if (av > bv) return  1 * sortDir;
      return 0;
    });
}


function renderTable() {
  const tbody      = $('movie-tbody');
  const emptyState = $('empty-state');
  const data       = getDisplayData();

  if (!data.length) {
    tbody.innerHTML        = '';
    emptyState.style.display = '';
    return;
  }

  emptyState.style.display = 'none';

  tbody.innerHTML = data.map((m, i) => {
    const [badgeClass, badgeLabel] = STATUS_MAP[m.status] || ['badge-plan', m.status];

    // ==========================================
    // ADDED: class="clickable-row" so CSS can add a pointer cursor
    // ==========================================
    return `
      <tr data-id="${m.id}" class="clickable-row">
        <td class="row-num">${i + 1}</td>
        <td class="movie-title-cell">
          ${m.title}
          <small>
            ${m.director !== '—' ? m.director : ''}
            ${m.duration ? ` · ${m.duration}m` : ''}
          </small>
        </td>
        <td><span class="genre-pill">${m.genre}</span></td>
        <td style="color:var(--text-secondary);">${m.year}</td>
        <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
        <td>${buildStarsHTML(m.rating)}</td>
        <td>
          <button
            class="btn-delete"
            onclick="deleteMovie(${m.id})"
            title="Remove '${m.title}'">
            ✕
          </button>
        </td>
      </tr>`;
  }).join('');
}


document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    currentFilter = tab.dataset.filter;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderTable();
  });
});

$('searchInput').addEventListener('input', function () {
  currentSearch = this.value;
  renderTable();
});

document.querySelectorAll('th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    if (sortCol === th.dataset.col) {
      sortDir *= -1;                
    } else {
      sortCol  = th.dataset.col;
      sortDir  = 1;                 
    }
    renderTable();
  });
});


// ==========================================
// ADDED: MODAL LOGIC AND EVENT DELEGATION
// ==========================================

const modal = document.getElementById('notesModal');
const closeModalBtn = document.querySelector('.close-modal');

// Kunin lahat ng elements sa loob ng modal natin
const mTitle = document.getElementById('modalMovieTitle');
const mStatus = document.getElementById('modalMovieStatus');
const mYear = document.getElementById('modalMovieYear');
const mDuration = document.getElementById('modalMovieDuration');
const mGenre = document.getElementById('modalMovieGenre');
const mDirector = document.getElementById('modalMovieDirector');
const mRating = document.getElementById('modalMovieRating');
const mNotes = document.getElementById('modalMovieNotes');

function openNotesModal(movie) {
  // 1. I-set ang Title
  mTitle.textContent = movie.title;
  
  // 2. I-set ang Status Badge (gamit yung STATUS_MAP natin sa taas)
  const [badgeClass, badgeLabel] = STATUS_MAP[movie.status] || ['badge-plan', movie.status];
  mStatus.className = `badge ${badgeClass}`;
  mStatus.textContent = badgeLabel;

  // 3. I-set ang Meta Info
  mYear.textContent = movie.year;
  mDuration.textContent = movie.duration ? `${movie.duration}m` : 'N/A';
  mGenre.textContent = movie.genre;
  mDirector.textContent = movie.director !== '—' ? movie.director : 'N/A';

  // 4. I-set ang Rating (Titingnan kung 'watched' ba ang status)
  if (movie.status === 'watched') {
    // Gagamitin natin yung buildStarsHTML function na ginawa natin para sa table
    mRating.innerHTML = buildStarsHTML(movie.rating);
  } else {
    mRating.innerHTML = '<span style="color: #666; font-style: italic;">Not yet watched</span>';
  }
  
  // 5. I-set ang Notes
  if (movie.notes && movie.notes.trim() !== "") {
    mNotes.textContent = movie.notes;
    mNotes.style.fontStyle = "normal";
    mNotes.style.color = "#ccc";
  } else {
    mNotes.textContent = "Walang notes na naka-save para sa movie na ito.";
    mNotes.style.fontStyle = "italic";
    mNotes.style.color = "#666";
  }
  
  // Buksan ang modal
  modal.classList.add('active');
}

closeModalBtn.addEventListener('click', () => {
  modal.classList.remove('active');
});

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('active');
  }
});

// Event Delegation - listens for clicks anywhere inside the table body
$('movie-tbody').addEventListener('click', (e) => {
  // Prevent modal from opening if the delete button was clicked
  if (e.target.closest('.btn-delete')) return;

  const row = e.target.closest('tr');
  if (!row) return; 

  const movieId = Number(row.dataset.id); 
  const movie = movies.find(m => m.id === movieId); 

  if (movie) {
    // Ipapasa na natin yung BUONG movie object sa function imbes na title at notes lang!
    openNotesModal(movie);
  }
});

/* ── INITIALISE ─────────────────────────────────────────────── */
renderTable();
updateStats();