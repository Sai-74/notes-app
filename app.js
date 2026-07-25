// Tracks the ID of the note currently being edited (null = creating new note)
let currentNoteId = null;
// Reference to the opened IndexedDB database instance
let db;
// In-memory cache of note objects loaded from IndexedDB
let notes = []
// In-memory cache of folder objects loaded from IndexedDB
let folders = []

// Safely escape HTML special characters to prevent HTML injection
// Used when rendering note bodies into the DOM as plain text
function escapeHTML(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

// Render the main note grid on the home screen.
// - Shows a "new note" card and cards for each note in `notes`.
// - Attaches click handlers to open a note in the editor.
function gridRender() {
  let notesHTML = '';
  // Add the "new note" card at the beginning
  notesHTML += `<div class="note-card js-new-note">+</div>`
  // Render each note as a card; escape HTML to keep it safe
  notes.forEach(note => {
    notesHTML += `<div class="note-card js-note-card" data-id="${note.id}">
    <div class="note-preview">${escapeHTML(note.title || 'Untitled')}</div>
    <div class="note-preview">${escapeHTML(note.body.slice(0, 50))}</div></div>`
  })

  // Insert the generated HTML into the grid container
  document.querySelector('#note-grid').innerHTML = notesHTML;

  // Add click handlers for each note card to open it in the editor
  document.querySelectorAll('.js-note-card').forEach(card => {
    card.addEventListener('click', () => {
      const noteId = card.dataset.id;
      if (noteId) {
        const note = notes.find(n => n.id === parseInt(noteId));
        if (note) {
          currentNoteId = note.id;
          document.querySelector('#note-title').value = note.title || '';
          document.querySelector('#note-body').value = note.body;
          document.querySelector('#folder-select').value = note.folder_id || '';
          switchScreen('editor-screen');
        }
      }
    });
  }); 

  // Add handler for creating a new note when '+' card is clicked
  document.querySelector('.js-new-note').addEventListener('click', () => {
    currentNoteId = null;
    document.querySelector('#note-title').value = '';
    document.querySelector('#note-body').value = '';
    document.querySelector('#folder-select').value = '';
    switchScreen('editor-screen');
  });
}

// Initial render of the grid when the script loads
gridRender();

// Render the list of folders in the sidebar.
// - Each folder card shows the name and a delete button.
// - Clicking a folder shows only notes belonging to that folder.
function folderRender() {
  let foldersHTML = '';
  folders.forEach(folder => {
    foldersHTML += `<div class="folder-card js-folder-card" data-id="${folder.folder_id}">
    ${folder.name}<button class="js-delete-folder-btn" data-id="${folder.folder_id}">🗑</button>
    </div>`
  })

  // Insert folders into the sidebar list
  document.querySelector('#folder-list').innerHTML = foldersHTML;

  // Clicking a folder card shows the folder view with its notes
  document.querySelectorAll('.js-folder-card').forEach(card => {
    card.addEventListener('click', () => {
      const folderId = card.dataset.id;
      if (folderId) {
        const folder = folders.find(f => f.folder_id === parseInt(folderId));
        document.querySelector('#folder-title').textContent = folder.name;
        const folderNotes = notes.filter(n => n.folder_id === parseInt(folderId));
        let notesHTML = '';
        folderNotes.forEach(note => {
          notesHTML += `<div class="note-card js-note-card" data-id="${note.id}">
          <div class="note-preview">${escapeHTML(note.title || 'Untitled')}</div>
          <div class="note-preview">${escapeHTML(note.body.slice(0, 50))}</div></div>`
        });
        document.querySelector('#folder-notes').innerHTML = notesHTML;

        // Attach click handlers to notes inside the folder view
        document.querySelectorAll('.js-note-card').forEach(card => {
          card.addEventListener('click', () => {
            const noteId = card.dataset.id;
            if (noteId) {
              const note = notes.find(n => n.id === parseInt(noteId));
              if (note) {
                currentNoteId = note.id;
                document.querySelector('#note-title').value = note.title || '';
                document.querySelector('#note-body').value = note.body;
                document.querySelector('#folder-select').value = note.folder_id || '';
                switchScreen('editor-screen');
              }
            }
          });
        }); 

        // Show the folder screen and close the sidebar on mobile
        switchScreen('folder-screen');
        document.getElementById('sidebar').classList.remove('open');
      }
    });
  });

  // Attach handlers for deleting folders
  document.querySelectorAll('.js-delete-folder-btn').forEach(button => {
    button.addEventListener('click', () => {
      const folderId = button.dataset.id;
      // Remove folder from in-memory list
      folders = folders.filter(f => f.folder_id !== parseInt(folderId));
      // Remove folder from IndexedDB
      const transaction = db.transaction('folders', 'readwrite');
      const foldersStore = transaction.objectStore('folders');
      foldersStore.delete(parseInt(folderId));
      // Clear folder association from notes that belonged to the deleted folder
      const notesToReset = notes.filter(n => n.folder_id === parseInt(folderId));
      notesToReset.forEach(note => {
        note.folder_id = null;
      });
      // Persist changes and re-render UI
      saveData();
      folderRender();
      folderDropdown();
    });
  });
}

// Initial render of folders when the script loads
folderRender();

// Populate the folder selection dropdown used in the editor
function folderDropdown() {
  let dropdownHTML = '<option value="">No Folder</option>';

  folders.forEach(folder => {
    dropdownHTML += `<option value="${folder.folder_id}">${folder.name}</option>`;
  });

  document.querySelector('#folder-select').innerHTML = dropdownHTML;
}

// Initial population of the folder dropdown
folderDropdown();

// Show only the requested screen (home, editor, folder, etc.) and hide others
function switchScreen(targetScreen) {
  document.querySelectorAll('.js-screen').forEach(screen => {
    if (screen.id === targetScreen) {
      screen.style.display = 'block';
    } else {
      screen.style.display = 'none';
    }
  });
}

// Wire up navigation buttons that switch between screens
document.querySelectorAll('.js-screen-btn').forEach(button => {
  button.addEventListener('click', () => {
    const targetScreen = button.dataset.target;
    switchScreen(targetScreen);
  });
});

// Handler for the editor "back" button. Saves the current note (either
// updates an existing note or creates a new one) and returns to the home screen.
document.querySelector('.js-editor-back-btn').addEventListener('click', () => {
  if (currentNoteId) {
    // Update existing note in memory
    const note = notes.find(n => n.id === parseInt(currentNoteId));
    if (note) {
      note.title = document.querySelector('#note-title').value || 'Untitled';
      note.body = document.querySelector('#note-body').value;
      note.folder_id = document.querySelector('#folder-select').value ? parseInt(document.querySelector('#folder-select').value) : null;
    }
    currentNoteId = null;
  } else {
    // Create a new note ID and add note if non-empty
    const newId = notes.length === 0 ? 1 : Math.max(...notes.map(n => n.id)) + 1;
    if (document.querySelector('#note-body').value.trim() !== '') {
      notes.push({
        id: newId,
        title: document.querySelector('#note-title').value || 'Untitled',
        body: document.querySelector('#note-body').value,
        folder_id: document.querySelector('#folder-select').value ? parseInt(document.querySelector('#folder-select').value) : null
      });
    }
  }
  // Persist changes and show the updated grid
  saveData();
  gridRender();
  switchScreen('home-screen');
});

// Delete the currently selected note (if any) from memory and IndexedDB
document.querySelector('.js-delete-btn').addEventListener('click', () => {
  if (currentNoteId) {  
    notes = notes.filter(n => n.id !== parseInt(currentNoteId));
    const transaction = db.transaction('notes', 'readwrite');
    const notesStore = transaction.objectStore('notes');
    notesStore.delete(parseInt(currentNoteId));
    currentNoteId = null;
    saveData();
    gridRender();
    switchScreen('home-screen');
  }
});

// Prompt the user for a folder name and create a new folder
document.querySelector('.js-add-folder-btn').addEventListener('click', () => {
  const folderName = prompt('Enter folder name:');
  if (folderName) {
    const newFolderId = folders.length === 0 ? 1 : Math.max(...folders.map(f => f.folder_id)) + 1;
    folders.push({
      folder_id: newFolderId,
      name: folderName
    });
    saveData();
    folderRender();
    folderDropdown();
  }
});

// Toggle the sidebar open/closed (useful for small screens)
document.querySelectorAll('.js-sidebar-btn').forEach(button => {
  button.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
});

// Handle changes to the search input and render matching notes in the search results area.
// This keeps the home grid hidden while search results are visible.
document.querySelector('#search-input').addEventListener('input', () => {
  const query = document.querySelector('#search-input').value.toLowerCase();

  // Filter notes by title or body text based on the current query.
  const results = notes.filter(note => {
    return (note.title && note.title.toLowerCase().includes(query)) || (note.body && note.body.toLowerCase().includes(query));
  });

  // Build the search results markup using escaped text to prevent injection.
  let searchResultsHTML = '';
  results.forEach(note => {
    searchResultsHTML += `<div class="search-result-item" data-id="${note.id}">
      <div class="note-preview">${escapeHTML(note.title || 'Untitled')}</div>
      <div class="note-preview">${escapeHTML(note.body.slice(0, 50))}</div>
    </div>`;
  });
  document.querySelector('#search-results').innerHTML = searchResultsHTML;

  // Attach click handlers for opening a note from the search results.
  document.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const noteId = item.dataset.id;
      if (noteId) {
        const note = notes.find(n => n.id === parseInt(noteId));
        if (note) {
          currentNoteId = note.id;
          document.querySelector('#note-title').value = note.title || '';
          document.querySelector('#note-body').value = note.body;
          document.querySelector('#folder-select').value = note.folder_id || '';
          switchScreen('editor-screen');
        }
      }
    });
  });

  // Show search results only when the query is non-empty.
  if (query.trim() !== '') {
    document.querySelector('#note-grid').style.display = 'none';
    document.querySelector('#search-results').style.display = 'block';
  } else {
    document.querySelector('#note-grid').style.display = 'grid';
    document.querySelector('#search-results').style.display = 'none';
  }
});

// Open (or create) the IndexedDB database used to persist notes and folders
const request = indexedDB.open('notesApp', 1);
request.onupgradeneeded = function(event) {
  db = event.target.result;
  // Create two object stores: notes and folders with their respective key paths
  db.createObjectStore('notes', { keyPath: 'id'});
  db.createObjectStore('folders', { keyPath: 'folder_id'});
};
request.onsuccess = function(event) {
  db = event.target.result;
  // Load persisted data into memory and render UI
  loadData();
};

function loadData() {
  const transaction = db.transaction(['notes', 'folders'], 'readonly');
  const notesStore = transaction.objectStore('notes');
  const foldersStore = transaction.objectStore('folders');
  const notesRequest = notesStore.getAll();
  const foldersRequest = foldersStore.getAll();
  notesRequest.onsuccess = function() {
    notes = notesRequest.result;
    gridRender();
  };
  foldersRequest.onsuccess = function() {
    folders = foldersRequest.result;
    folderRender();
    folderDropdown();
  };
}

function saveData() {
  const transaction = db.transaction(['notes', 'folders'], 'readwrite');
  const notesStore = transaction.objectStore('notes');
  const foldersStore = transaction.objectStore('folders');
  notes.forEach(note => {
    notesStore.put(note);
  });
  folders.forEach(folder => {
    foldersStore.put(folder);
  });
}

// Register the service worker to enable offline support (if available)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}

