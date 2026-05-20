let currentNoteId = null;
let db;
let notes = []
let folders = []

function gridRender() {
  let notesHTML = '';
  notesHTML += `<div class="note-card js-new-note">+</div>`
  notes.forEach(note => {
    notesHTML += `<div class="note-card js-note-card" data-id="${note.id}">${note.body}</div>`
  })
  document.querySelector('#note-grid').innerHTML = notesHTML;
  document.querySelectorAll('.js-note-card').forEach(card => {
    card.addEventListener('click', () => {
      const noteId = card.dataset.id;
      if (noteId) {
        const note = notes.find(n => n.id === parseInt(noteId));
        if (note) {
          currentNoteId = note.id;
          document.querySelector('#note-body').value = note.body;
          document.querySelector('#folder-select').value = note.folder_id || '';
          switchScreen('editor-screen');
        }
      }
    });
  }); 
  document.querySelector('.js-new-note').addEventListener('click', () => {
    currentNoteId = null;
    document.querySelector('#note-body').value = '';
    document.querySelector('#folder-select').value = '';
    switchScreen('editor-screen');
  });
}
gridRender();

function folderRender() {
  let foldersHTML = '';
  folders.forEach(folder => {
    foldersHTML += `<div class="folder-card js-folder-card" data-id="${folder.folder_id}">
    ${folder.name}<button class="js-delete-folder-btn" data-id="${folder.folder_id}">🗑</button>
    </div>`
  })
  document.querySelector('#folder-list').innerHTML = foldersHTML;
  document.querySelectorAll('.js-folder-card').forEach(card => {
    card.addEventListener('click', () => {
      const folderId = card.dataset.id;
      if (folderId) {
        const folder = folders.find(f => f.folder_id === parseInt(folderId));
        document.querySelector('#folder-title').textContent = folder.name;
        const folderNotes = notes.filter(n => n.folder_id === parseInt(folderId));
        let notesHTML = '';
        folderNotes.forEach(note => {
          notesHTML += `<div class="note-card js-note-card" data-id="${note.id}">${note.body}</div>`
        });
        document.querySelector('#folder-notes').innerHTML = notesHTML;
        document.querySelectorAll('.js-note-card').forEach(card => {
          card.addEventListener('click', () => {
            const noteId = card.dataset.id;
            if (noteId) {
              const note = notes.find(n => n.id === parseInt(noteId));
              if (note) {
                currentNoteId = note.id;
                document.querySelector('#note-body').value = note.body;
                document.querySelector('#folder-select').value = note.folder_id || '';
                switchScreen('editor-screen');
              }
            }
          });
        }); 
        switchScreen('folder-screen');
        document.getElementById('sidebar').classList.remove('open');
      }
    });
  });
  document.querySelectorAll('.js-delete-folder-btn').forEach(button => {
    button.addEventListener('click', () => {
      const folderId = button.dataset.id;
      folders = folders.filter(f => f.folder_id !== parseInt(folderId));
      const transaction = db.transaction('folders', 'readwrite');
      const foldersStore = transaction.objectStore('folders');
      foldersStore.delete(parseInt(folderId));
      const notesToReset = notes.filter(n => n.folder_id === parseInt(folderId));
      notesToReset.forEach(note => {
        note.folder_id = null;
      });
      saveData();
      folderRender();
      folderDropdown();
    });
  });
}
folderRender();

function folderDropdown() {
  let dropdownHTML = '<option value="">No Folder</option>';

  folders.forEach(folder => {
    dropdownHTML += `<option value="${folder.folder_id}">${folder.name}</option>`;
  });

  document.querySelector('#folder-select').innerHTML = dropdownHTML;
}
folderDropdown();

function switchScreen(targetScreen) {
  document.querySelectorAll('.js-screen').forEach(screen => {
    if (screen.id === targetScreen) {
      screen.style.display = 'block';
    } else {
      screen.style.display = 'none';
    }
  });
}

document.querySelectorAll('.js-screen-btn').forEach(button => {
  button.addEventListener('click', () => {
    const targetScreen = button.dataset.target;
    switchScreen(targetScreen);
  });
});

document.querySelector('.js-editor-back-btn').addEventListener('click', () => {
  if (currentNoteId) {
    const note = notes.find(n => n.id === parseInt(currentNoteId));
    if (note) {
      note.body = document.querySelector('#note-body').value;
      note.folder_id = document.querySelector('#folder-select').value ? parseInt(document.querySelector('#folder-select').value) : null;
    }
    currentNoteId = null;
  } else {
    const newId = notes.length === 0 ? 1 : Math.max(...notes.map(n => n.id)) + 1;
    if (document.querySelector('#note-body').value.trim() !== '') {
      notes.push({
        id: newId,
        body: document.querySelector('#note-body').value,
        folder_id: document.querySelector('#folder-select').value ? parseInt(document.querySelector('#folder-select').value) : null
      });
    }
  }
  saveData();
  gridRender();
  switchScreen('home-screen');
});

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

document.querySelectorAll('.js-sidebar-btn').forEach(button => {
  button.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
});

const request = indexedDB.open('notesApp', 1);
request.onupgradeneeded = function(event) {
  db = event.target.result;
  db.createObjectStore('notes', { keyPath: 'id'});
  db.createObjectStore('folders', { keyPath: 'folder_id'});
};
request.onsuccess = function(event) {
  db = event.target.result;
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