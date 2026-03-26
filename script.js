/* ============================================================
   CineLog — script.js
   Main application logic for index.html (Watchlist page)
   ITEL 203 Group Performance Task #1
   ============================================================ */

/* ── STATE ─────────────────────────────────────────────────── */
/* Load existing movies from localStorage on startup, or start with an empty array */
let movies = JSON.parse(localStorage.getItem('cinelog_movies') || '[]');

/* Current filter tab, search query, sort column, and sort direction */
let currentFilter  = 'all';
let currentSearch  = '';
let sortCol        = '';
let sortDir        = 1;   /* 1 = ascending, -1 = descending */
let selectedRating = 0;   /* 0 means no rating selected */

/* ── PERSISTENCE ────────────────────────────────────────────── */
/* Serialise the movies array to localStorage */
const saveMovies = () =>
  localStorage.setItem('cinelog_movies', JSON.stringify(movies));

/* Shorthand for getElementById */
const $ = id => document.getElementById(id);


/* ── TOAST NOTIFICATIONS ────────────────────────────────────── */
/* Show a temporary notification at the bottom-right of the screen */
function showToast(message, type = 'success') {
  const container = $('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span>${type === 'success' ? '✅' : '❌'}</span>
    <span>${message}</span>`;
  container.appendChild(el);

  /* Auto-dismiss after 3 seconds with a fade-out animation */
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}


/* ── STATS COUNTER ANIMATION ────────────────────────────────── */
/* Briefly scale up a stat counter to animate a value change */
function bumpStat(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove('bump');   /* Reset the class first to re-trigger the animation */
  void el.offsetWidth;           /* Force a reflow so the animation restarts */
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 220);
}


/* ── STATS BAR ──────────────────────────────────────────────── */
/* Recalculate and update all stat counters in the stats bar */
function updateStats() {
  const total    = movies.filter(m => m.status !== 'deleted').length;
  const watched  = movies.filter(m => m.status === 'watched').length;
  const watching = movies.filter(m => m.status === 'watching').length;
  const plan     = movies.filter(m => m.status === 'plan').length;
  const rated    = movies.filter(m => m.rating > 0);
  const avg      = rated.length
    ? (rated.reduce((s, m) => s + m.rating, 0) / rated.length).toFixed(1) + '★'
    : '—';

  /* Map stat element IDs to their computed values */
  const els = {
    'stat-total':    total,
    'stat-watched':  watched,
    'stat-watching': watching,
    'stat-plan':     plan,
  };

  /* Update each counter and trigger the bump animation if the value changed */
  Object.entries(els).forEach(([id, val]) => {
    const el = $(id);
    if (el && el.textContent !== String(val)) {
      el.textContent = val;
      bumpStat(id);
    }
  });

  /* Average rating is updated separately since it has no bump animation */
  $('stat-avg').textContent = avg;
}


/* ── STAR RATING INPUT (Add Movie form) ─────────────────────── */
const allStars  = document.querySelectorAll('#star-group .star-btn');
const starGroup = $('star-group');
const lockMsg   = $('rating-lock-msg');

/* Sync the visual state of all stars to the selectedRating value */
function refreshStars() {
  allStars.forEach(s =>
    s.classList.toggle('active', +s.dataset.val <= selectedRating)
  );
}

/* Lock or unlock the star rating input based on the selected status */
function setRatingLock(isLocked) {
  if (isLocked) {
    starGroup.classList.add('disabled');
    lockMsg.classList.add('show');
    selectedRating    = 0;     /* Reset the rating when locking */
    refreshStars();
    $('rating').value = 0;
  } else {
    starGroup.classList.remove('disabled');
    lockMsg.classList.remove('show');
  }
}

/* Hover preview: highlight stars up to the hovered value */
allStars.forEach(btn => {
  btn.addEventListener('mouseenter', () => {
    if (starGroup.classList.contains('disabled')) return;
    const val = +btn.dataset.val;
    allStars.forEach(s => s.classList.toggle('active', +s.dataset.val <= val));
  });

  /* Restore the actual selected rating when the cursor leaves */
  btn.addEventListener('mouseleave', () => {
    refreshStars();
  });

  /* Set the selected rating on click */
  btn.addEventListener('click', () => {
    if (starGroup.classList.contains('disabled')) return;
    selectedRating    = +btn.dataset.val;
    $('rating').value = selectedRating;
    refreshStars();
  });
});

/* Enable or disable the rating input whenever the status dropdown changes */
$('status').addEventListener('change', function () {
  setRatingLock(this.value !== 'watched');
});

/* Start with the rating locked — user must select "Watched" first */
setRatingLock(true);


/* ── CUSTOM GENRE INPUT ─────────────────────────────────────── */
/* Show the custom genre text field when "Other" is selected in the dropdown */
const genreSelect       = document.getElementById('genre');
const customGenreGroup  = document.getElementById('customGenreGroup');
const customGenreInput  = document.getElementById('customGenre');

if (genreSelect && customGenreGroup) {
  genreSelect.addEventListener('change', (e) => {
    /* Using toLowerCase() so both 'Other' and 'other' trigger the custom input */
    if (e.target.value.toLowerCase() === 'other') {
      customGenreGroup.style.display = 'block'; /* Show the text field */
      customGenreInput.required      = true;
    } else {
      customGenreGroup.style.display = 'none';  /* Hide and clear the text field */
      customGenreInput.required      = false;
      customGenreInput.value         = '';
    }
  });
}


/* ── FORM VALIDATION HELPERS ────────────────────────────────── */
/* Toggle the error state on a field and show or hide its error message */
function setFieldState(inputId, errId, isError) {
  const input = $(inputId);
  const errEl = $(errId);
  if (!input || !errEl) return;

  input.classList.toggle('is-error', isError);
  input.classList.toggle('is-valid', !isError && input.value.trim() !== '');
  errEl.classList.toggle('show', isError);
}

/* Run all validation rules and return true if the form is valid */
function validateForm() {
  let isValid = true;

  const title    = $('movieTitle').value.trim();
  const yearVal  = $('releaseYear').value;
  const year     = Number(yearVal);
  const dur      = $('duration').value;
  const director = $('director').value.trim();
  const status   = $('status').value;
  const notes    = $('notes').value.trim();

  /* Resolve the genre value — use the custom input text if "Other" is selected */
  let genre = $('genre').value;
  if (genre.toLowerCase() === 'other') {
    genre = $('customGenre').value.trim();
  }

  /* Validate each required or constrained field */
  if (!title)                                                           { setFieldState('movieTitle',   'err-title',    true);  isValid = false; } else { setFieldState('movieTitle',   'err-title',    false); }
  if (!yearVal || year < 1888 || year > 2030)                           { setFieldState('releaseYear',  'err-year',     true);  isValid = false; } else { setFieldState('releaseYear',  'err-year',     false); }
  if (dur !== '' && (isNaN(Number(dur)) || Number(dur) < 1 || Number(dur) > 600)) { setFieldState('duration', 'err-duration', true); isValid = false; } else { setFieldState('duration', 'err-duration', false); }
  if (director && /\d/.test(director))                                  { setFieldState('director',    'err-director', true);  isValid = false; } else { setFieldState('director',    'err-director', false); }

  /* Genre validation — accounts for the custom genre text field */
  if (!genre)  { setFieldState('genre',  'err-genre',  true);  isValid = false; } else { setFieldState('genre',  'err-genre',  false); }
  if (!status) { setFieldState('status', 'err-status', true);  isValid = false; } else { setFieldState('status', 'err-status', false); }
  if (notes.length > 300) { setFieldState('notes', 'err-notes', true); isValid = false; } else { setFieldState('notes', 'err-notes', false); }

  return isValid;
}

/* Re-run validation live as the user types or changes any field */
['movieTitle', 'releaseYear', 'duration', 'director', 'genre', 'customGenre', 'status', 'notes'].forEach(id => {
  const el = $(id);
  if (!el) return;
  el.addEventListener('input',  validateForm);
  el.addEventListener('change', validateForm);
});


/* ── FORM SUBMISSION ────────────────────────────────────────── */
$('movie-form').addEventListener('submit', function (e) {
  e.preventDefault(); /* Prevent the default browser form submission */

  if (!validateForm()) {
    showToast('Please fix the errors before adding.', 'error');
    return;
  }

  /* Resolve the final genre value — use custom text if "Other" was selected */
  let finalGenre = $('genre').value;
  if (finalGenre.toLowerCase() === 'other') {
    finalGenre = $('customGenre').value.trim();
  }

  /* Build the new movie object */
  const movie = {
    id:       Date.now(), /* Use timestamp as a unique ID */
    title:    $('movieTitle').value.trim(),
    year:     Number($('releaseYear').value),
    duration: $('duration').value ? Number($('duration').value) : null,
    director: $('director').value.trim() || '—',
    genre:    finalGenre,
    status:   $('status').value,
    rating:   selectedRating,
    notes:    $('notes').value.trim(),
  };

  /* Prepend to the array so the newest movie appears at the top */
  movies.unshift(movie);
  saveMovies();

  renderTable();
  updateStats();
  showToast(`"${movie.title}" added to your watchlist!`);

  /* Reset the form and all UI state */
  this.reset();

  /* Hide the custom genre field after submit */
  if (customGenreGroup) {
    customGenreGroup.style.display = 'none';
  }

  selectedRating    = 0;
  $('rating').value = 0;
  refreshStars();
  setRatingLock(true); /* Re-lock the rating input */

  /* Clear all validation state classes from the form fields */
  ['movieTitle', 'releaseYear', 'duration', 'director', 'genre', 'customGenre', 'status', 'notes']
    .forEach(id => {
      const el = $(id);
      if (el) el.classList.remove('is-error', 'is-valid');
    });
  document.querySelectorAll('.error-msg').forEach(el => el.classList.remove('show'));
});


/* ── DELETE MOVIE ───────────────────────────────────────────── */
/* Soft-delete moves the movie to History; hard-delete removes it permanently */
function deleteMovie(id) {
  const target = movies.find(m => m.id === id);
  if (!target) return;

  if (target.status === 'deleted') {
    /* Movie is already in history — remove it permanently */
    movies = movies.filter(m => m.id !== id);
    showToast(`"${target.title}" permanently deleted.`, 'error');
  } else {
    /* Move to history (soft delete) */
    target.status = 'deleted';
    showToast(`"${target.title}" moved to History.`, 'error');
  }

  saveMovies();
  renderTable();
  updateStats();
}

/* Expose deleteMovie globally so inline onclick handlers in the table can call it */
window.deleteMovie = deleteMovie;


/* ── STAR HTML BUILDER ──────────────────────────────────────── */
/* Generate read-only star HTML for display in table rows */
function buildStarsHTML(n) {
  if (!n) return '<span style="color:var(--text-muted);font-size:0.72rem;">—</span>';
  let html = '<span class="stars-display">';
  for (let i = 1; i <= 5; i++) html += i <= n ? '★' : '<span class="empty">★</span>';
  return html + '</span>';
}

/* ── STATUS MAP ─────────────────────────────────────────────── */
/* Maps status keys to [badgeClass, badgeLabel] tuples used in the table */
const STATUS_MAP = {
  watched:  ['badge-watched',  '✓ Watched'],
  watching: ['badge-watching', '▶ Watching'],
  plan:     ['badge-plan',     '◷ Plan to Watch'],
  dropped:  ['badge-dropped',  '✕ Dropped'],
  deleted:  ['badge-deleted',  '🗑 Deleted'],
};


/* ── FILTER & SORT DATA ─────────────────────────────────────── */
/* Returns the filtered and sorted list of movies to display */
function getDisplayData() {
  return movies
    .filter(m => {
      /* "All" tab shows everything except deleted; other tabs match exactly */
      const matchFilter = currentFilter === 'all'
        ? m.status !== 'deleted'
        : m.status === currentFilter;
      /* Search matches title, genre, or director */
      const q = currentSearch.toLowerCase();
      const matchSearch = !q
        || m.title.toLowerCase().includes(q)
        || m.genre.toLowerCase().includes(q)
        || m.director.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    })
    .sort((a, b) => {
      if (!sortCol) return 0; /* No column selected — preserve insertion order */
      let av = a[sortCol];
      let bv = b[sortCol];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return -1 * sortDir;
      if (av > bv) return  1 * sortDir;
      return 0;
    });
}


/* ── TABLE RENDERER ─────────────────────────────────────────── */
/* Rebuild the entire table body from the current filtered + sorted data */
function renderTable() {
  const tbody      = $('movie-tbody');
  const emptyState = $('empty-state');
  const data       = getDisplayData();

  /* Show the empty state if there are no matching movies */
  if (!data.length) {
    tbody.innerHTML          = '';
    emptyState.style.display = '';
    return;
  }

  emptyState.style.display = 'none';

  tbody.innerHTML = data.map((m, i) => {
    const [badgeClass, badgeLabel] = STATUS_MAP[m.status] || ['badge-plan', m.status];

    /* Each row stores the movie ID as a data attribute for click delegation */
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


/* ── FILTER TABS ────────────────────────────────────────────── */
/* Switch the active filter when a tab is clicked */
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    currentFilter = tab.dataset.filter;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderTable();
  });
});

/* ── LIVE SEARCH ────────────────────────────────────────────── */
/* Re-render the table on every keystroke in the search box */
$('searchInput').addEventListener('input', function () {
  currentSearch = this.value;
  renderTable();
});

/* ── COLUMN SORTING ─────────────────────────────────────────── */
/* Toggle sort direction on repeated clicks; reset direction on a new column */
document.querySelectorAll('th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    if (sortCol === th.dataset.col) {
      sortDir *= -1;             /* Flip direction on the same column */
    } else {
      sortCol = th.dataset.col;
      sortDir = 1;               /* Default to ascending for a new column */
    }
    renderTable();
  });
});


/* ── NOTES MODAL ────────────────────────────────────────────── */
const modal        = document.getElementById('notesModal');
const closeModalBtn = document.querySelector('.close-modal');

/* Cache references to all text elements inside the Notes modal */
const mTitle    = document.getElementById('modalMovieTitle');
const mStatus   = document.getElementById('modalMovieStatus');
const mYear     = document.getElementById('modalMovieYear');
const mDuration = document.getElementById('modalMovieDuration');
const mGenre    = document.getElementById('modalMovieGenre');
const mDirector = document.getElementById('modalMovieDirector');
const mRating   = document.getElementById('modalMovieRating');
const mNotes    = document.getElementById('modalMovieNotes');

/* Populate the Notes modal with the selected movie's data and open it */
function openNotesModal(movie) {
  /* Set the movie title */
  mTitle.textContent = movie.title;

  /* Apply the correct status badge class and label */
  const [badgeClass, badgeLabel] = STATUS_MAP[movie.status] || ['badge-plan', movie.status];
  mStatus.className   = `badge ${badgeClass}`;
  mStatus.textContent = badgeLabel;

  /* Populate the meta info row */
  mYear.textContent     = movie.year;
  mDuration.textContent = movie.duration ? `${movie.duration}m` : 'N/A';
  mGenre.textContent    = movie.genre;
  mDirector.textContent = movie.director !== '—' ? movie.director : 'N/A';

  /* Show the star rating only if the movie has been watched */
  if (movie.status === 'watched') {
    mRating.innerHTML = buildStarsHTML(movie.rating);
  } else {
    mRating.innerHTML = '<span style="color:#666;font-style:italic;">Not yet watched</span>';
  }

  /* Display the notes text, or a placeholder if none was entered */
  if (movie.notes && movie.notes.trim() !== '') {
    mNotes.textContent  = movie.notes;
    mNotes.style.fontStyle = 'normal';
    mNotes.style.color     = '#ccc';
  } else {
    mNotes.textContent     = 'No notes saved for this movie.';
    mNotes.style.fontStyle = 'italic';
    mNotes.style.color     = '#666';
  }

  /* Open the modal */
  modal.classList.add('active');
}

/* Close the Notes modal when the (×) button is clicked */
closeModalBtn.addEventListener('click', () => {
  modal.classList.remove('active');
});

/* Close the Notes modal when the backdrop is clicked */
window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('active');
  }
});

/* ── TABLE ROW CLICK DELEGATION ─────────────────────────────── */
/* A single listener on the tbody handles all row and badge clicks */
$('movie-tbody').addEventListener('click', (e) => {
  /* Ignore clicks on the delete button */
  if (e.target.closest('.btn-delete')) return;

  const row = e.target.closest('tr');
  if (!row) return;

  const movieId = Number(row.dataset.id);
  const movie   = movies.find(m => m.id === movieId);
  if (!movie) return;

  /* If the status badge was clicked, open the Update Status modal */
  if (e.target.closest('.badge')) {
    openUpdateModal(movie);
    return; /* Prevent the Notes modal from also opening */
  }

  /* Otherwise open the Notes modal for the clicked row */
  openNotesModal(movie);
});


/* ── UPDATE STATUS MODAL ────────────────────────────────────── */
const updateModal   = document.getElementById('updateModal');
const closeUpdateBtn = document.querySelector('.close-update-modal');
const updTitle      = document.getElementById('updateMovieTitle');
const updId         = document.getElementById('updateMovieId');
const updStatus     = document.getElementById('updateStatus');
const updStarGroup  = document.getElementById('update-star-group');
const updLockMsg    = document.getElementById('update-rating-lock');
const updRatingInput = document.getElementById('updateRating');
const updStars      = document.querySelectorAll('.upd-star-btn');
const btnSaveUpdate = document.getElementById('btnSaveUpdate');

let currentUpdRating = 0; /* Tracks the selected rating inside the Update modal */

/* Sync the update-modal star visuals to the currentUpdRating value */
function refreshUpdStars() {
  updStars.forEach(s => {
    s.classList.toggle('active', +s.dataset.val <= currentUpdRating);
  });
}

/* Lock or unlock the star rating in the Update modal */
function setUpdRatingLock(isLocked) {
  if (isLocked) {
    updStarGroup.classList.add('disabled');
    updLockMsg.classList.add('show');
    currentUpdRating    = 0;
    refreshUpdStars();
    updRatingInput.value = 0;
  } else {
    updStarGroup.classList.remove('disabled');
    updLockMsg.classList.remove('show');
  }
}

/* Hover preview and click selection for the Update modal's star buttons */
updStars.forEach(btn => {
  btn.addEventListener('mouseenter', () => {
    if (updStarGroup.classList.contains('disabled')) return;
    const val = +btn.dataset.val;
    updStars.forEach(s => s.classList.toggle('active', +s.dataset.val <= val));
  });
  btn.addEventListener('mouseleave', refreshUpdStars);

  btn.addEventListener('click', () => {
    if (updStarGroup.classList.contains('disabled')) return;
    currentUpdRating     = +btn.dataset.val;
    updRatingInput.value = currentUpdRating;
    refreshUpdStars();
  });
});

/* Enable or disable the rating when the status dropdown changes */
updStatus.addEventListener('change', function () {
  setUpdRatingLock(this.value !== 'watched');
});

/* Populate and open the Update Status modal for the given movie */
function openUpdateModal(movie) {
  updTitle.textContent = movie.title;
  updId.value          = movie.id;
  updStatus.value      = movie.status;

  /* If the movie is already "Watched", unlock the stars and show the current rating */
  if (movie.status === 'watched') {
    setUpdRatingLock(false);
    currentUpdRating     = movie.rating || 0;
    updRatingInput.value = currentUpdRating;
    refreshUpdStars();
  } else {
    setUpdRatingLock(true);
  }

  updateModal.classList.add('active');
}

/* Close the Update modal via the (×) button */
closeUpdateBtn.addEventListener('click', () => updateModal.classList.remove('active'));

/* Close the Update modal when clicking outside the dialog */
window.addEventListener('click', (e) => {
  if (e.target === updateModal) updateModal.classList.remove('active');
});

/* Save the updated status and rating when the Save button is clicked */
btnSaveUpdate.addEventListener('click', () => {
  const movieId  = Number(updId.value);
  const newStatus = updStatus.value;
  const newRating = Number(updRatingInput.value);

  /* Find the movie in the array and update its status and rating */
  const movieIndex = movies.findIndex(m => m.id === movieId);
  if (movieIndex > -1) {
    movies[movieIndex].status = newStatus;
    /* Only store a rating if the new status is "Watched"; otherwise reset to 0 */
    movies[movieIndex].rating = newStatus === 'watched' ? newRating : 0;

    saveMovies();
    renderTable();
    updateStats();
    showToast(`"${movies[movieIndex].title}" status updated!`);
  }

  updateModal.classList.remove('active');
});


/* ── INITIALISE ─────────────────────────────────────────────── */
/* Render the table and update all stats on first load */
renderTable();
updateStats();