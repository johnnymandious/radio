(() => {
  const DATA_URL = 'assets/radio/albums.json';
  const SITE = 'https://johnnymandious.github.io/radio/';
  const $ = id => document.getElementById(id);
  const audio = $('radio-audio');
  const player = document.querySelector('.radio-player');
  const ui = {
    cover: $('np-cover'), status: $('np-status'), title: $('np-title'), artist: $('np-artist'), album: $('np-album'),
    time: $('np-time'), length: $('np-length'), seek: $('np-seek'), volume: $('np-volume'),
    play: $('btn-play'), prev: $('btn-prev'), next: $('btn-next'),
    source: $('np-source'), licence: $('np-licence'), download: $('np-download'), note: $('np-note'),
    upNext: $('up-next'), library: $('library'), count: $('library-count')
  };
  const modeButtons = [...document.querySelectorAll('.radio-mode button')];

  let albums = [];
  let tracks = [];      // every track in the library, in album order
  let order = [];       // indexes into tracks, in the order they will play
  let pos = 0;          // position in order
  let mode = 'normal';
  let errors = 0;
  let seeking = false;

  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem('radio-' + key)); } catch { return null; } },
    set(key, value) { try { localStorage.setItem('radio-' + key, JSON.stringify(value)); } catch {} }
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const toSeconds = d => String(d).split(':').reduce((t, n) => t * 60 + Number(n), 0);
  const clock = s => {
    if (!isFinite(s)) return '0:00';
    s = Math.floor(s);
    const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, r = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
  };
  const licenceOf = t => t.track.licence || t.album.licence;
  const sourceOf = t => t.track.source || t.album.source;
  const absolute = url => new URL(url, location.href).href;

  function toast(message, ms = 4000) {
    const el = document.createElement('div');
    el.className = 'radio-toast';
    el.setAttribute('role', 'status');
    el.textContent = message;
    document.body.append(el);
    setTimeout(() => el.remove(), ms);
  }

  // ---------- Play order ----------
  function shuffled(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function buildOrder(startIndex) {
    const all = tracks.map((_, i) => i);
    if (mode === 'shuffle') {
      order = [startIndex, ...shuffled(all.filter(i => i !== startIndex))];
      pos = 0;
    } else {
      order = all;
      pos = startIndex;
    }
  }
  const current = () => tracks[order[pos]];

  function setMode(newMode) {
    if (!tracks.length) return;
    mode = newMode;
    store.set('mode', mode);
    modeButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    buildOrder(order[pos] ?? 0);
    renderUpNext();
  }

  // ---------- Playback ----------
  function load(autoplay) {
    const t = current();
    if (!t) return;
    audio.src = t.track.file;
    showNowPlaying(t);
    store.set('track', t.key);
    if (autoplay) start();
  }
  function start() {
    if (!audio.src) load(false);
    const attempt = audio.play();
    if (attempt) attempt.catch(err => { if (err.name !== 'AbortError') setPlaying(false); });
  }
  function go(step, autoplay = !audio.paused || player.classList.contains('is-playing')) {
    pos += step;
    if (pos >= order.length) {
      if (mode === 'shuffle') { order = shuffled(order); }
      pos = 0;
    }
    if (pos < 0) pos = order.length - 1;
    load(autoplay);
  }
  function playIndex(index) {
    const at = order.indexOf(index);
    if (mode === 'shuffle' || at < 0) buildOrder(index); else pos = at;
    load(true);
  }
  function setPlaying(on) {
    player.classList.toggle('is-playing', on);
    ui.play.textContent = on ? 'PAUSE ❚❚' : 'PLAY ▶';
    ui.play.setAttribute('aria-label', on ? 'Pause' : 'Play');
    ui.status.textContent = on ? 'On air · now playing' : (audio.currentTime ? 'Paused' : 'Press play to tune in');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = on ? 'playing' : 'paused';
  }

  audio.addEventListener('playing', () => { errors = 0; setPlaying(true); });
  audio.addEventListener('pause', () => setPlaying(false));
  audio.addEventListener('ended', () => go(1, true));
  audio.addEventListener('waiting', () => { ui.status.textContent = 'Buffering…'; });
  audio.addEventListener('loadedmetadata', () => { ui.length.textContent = clock(audio.duration); });
  audio.addEventListener('timeupdate', () => {
    if (seeking || !audio.duration) return;
    ui.seek.value = (audio.currentTime / audio.duration) * 100;
    ui.time.textContent = clock(audio.currentTime);
  });
  audio.addEventListener('error', () => {
    if (!audio.src) return;
    errors++;
    if (errors > 5) {
      setPlaying(false);
      ui.status.textContent = 'Signal lost. Check your connection and press play.';
      errors = 0;
      return;
    }
    ui.status.textContent = 'Track unavailable, skipping…';
    setTimeout(() => go(1, true), 1500);
  });

  ui.play.addEventListener('click', () => (audio.paused ? start() : audio.pause()));
  ui.next.addEventListener('click', () => go(1));
  ui.prev.addEventListener('click', () => {
    if (audio.currentTime > 4) audio.currentTime = 0; else go(-1);
  });
  ui.seek.addEventListener('input', () => {
    seeking = true;
    if (audio.duration) ui.time.textContent = clock(audio.duration * ui.seek.value / 100);
  });
  ui.seek.addEventListener('change', () => {
    if (audio.duration) audio.currentTime = audio.duration * ui.seek.value / 100;
    seeking = false;
  });
  ui.volume.addEventListener('input', () => { audio.volume = Number(ui.volume.value); store.set('volume', audio.volume); });
  modeButtons.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  ui.download.addEventListener('click', () => current() && downloadTrack(current(), ui.download));
  ui.upNext.addEventListener('click', e => {
    const b = e.target.closest('button[data-pos]');
    if (!b) return;
    pos = Number(b.dataset.pos);
    load(true);
  });

  // ---------- Display ----------
  function showNowPlaying(t) {
    const {album, track} = t;
    const licence = licenceOf(t);
    ui.cover.src = album.cover;
    ui.cover.alt = `${album.title} album cover`;
    ui.title.textContent = track.title;
    ui.artist.textContent = album.artist;
    ui.album.textContent = album.title + (album.year ? ` (${album.year})` : '');
    ui.source.href = sourceOf(t);
    ui.source.textContent = `Source: ${album.sourceName || 'original page'} ↗`;
    ui.licence.href = licence.url;
    ui.licence.textContent = `${licence.name} ↗`;
    ui.note.hidden = !album.licenceNote;
    ui.note.textContent = album.licenceNote || '';
    ui.seek.value = 0;
    ui.time.textContent = '0:00';
    ui.length.textContent = track.duration;
    document.title = `${track.title} · ${album.artist} | Deep Space Radio`;
    document.querySelectorAll('.is-current').forEach(el => el.classList.remove('is-current'));
    document.getElementById('album-' + album.id)?.classList.add('is-current');
    document.querySelector(`[data-track="${CSS.escape(t.key)}"]`)?.classList.add('is-current');
    renderUpNext();
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title, artist: album.artist, album: album.title,
        artwork: [{src: absolute(album.cover), sizes: '500x500', type: 'image/jpeg'}]
      });
    }
  }
  function renderUpNext() {
    const items = [];
    for (let i = 1; i <= 5 && i < order.length; i++) {
      const p = (pos + i) % order.length;
      const t = tracks[order[p]];
      items.push(`<li><button type="button" data-pos="${p}"><strong>${esc(t.track.title)}</strong><span>${esc(t.album.artist)} · ${esc(t.track.duration)}</span></button></li>`);
    }
    ui.upNext.innerHTML = items.join('');
  }
  function renderLibrary() {
    const totalSeconds = tracks.reduce((s, t) => s + toSeconds(t.track.duration), 0);
    ui.count.textContent = `${albums.length} albums · ${tracks.length} tracks · ${Math.round(totalSeconds / 3600)} hours`;
    ui.library.innerHTML = albums.map((album, a) => {
      const seconds = album.tracks.reduce((s, t) => s + toSeconds(t.duration), 0);
      const facts = [album.year, album.label, `${album.tracks.length} ${album.tracks.length === 1 ? 'track' : 'tracks'}`, clock(seconds)].filter(Boolean).join(' · ');
      const rows = album.tracks.map((track, i) => {
        const key = `${album.id}/${i}`;
        return `<li data-track="${esc(key)}"><button type="button" class="radio-track-play" data-play="${esc(key)}" aria-label="Play ${esc(track.title)}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(track.title)}</button><time>${esc(track.duration)}</time><button type="button" class="radio-track-dl" data-download="${esc(key)}" aria-label="Download ${esc(track.title)}" title="Download track">↓</button></li>`;
      }).join('');
      return `<article class="radio-album-card panel" id="album-${esc(album.id)}">
        <img src="${esc(album.cover)}" alt="${esc(album.title)} album cover" width="500" height="500" loading="${a < 4 ? 'eager' : 'lazy'}" decoding="async">
        <div class="radio-album-copy">
          <h3>${esc(album.title)}</h3>
          <p class="radio-by">${esc(album.artist)}</p>
          <p class="radio-facts">${esc(facts)}</p>
          <p class="radio-links"><a href="${esc(album.source)}" target="_blank" rel="noopener">Source ↗</a><a href="${esc(album.licence.url)}" target="_blank" rel="noopener license">${esc(album.licence.name)} ↗</a></p>
          <div class="radio-album-actions"><button type="button" data-play-album="${a}">Play album ▶</button><button type="button" data-download-album="${a}">Download album ↓</button></div>
        </div>
        <details><summary>TRACKLIST</summary>${album.licenceNote ? `<p class="radio-licence-note">${esc(album.licenceNote)}</p>` : ''}<ol class="radio-tracks">${rows}</ol></details>
      </article>`;
    }).join('');
  }
  ui.library.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const byKey = key => tracks.findIndex(t => t.key === key);
    if (b.dataset.play) playIndex(byKey(b.dataset.play));
    else if (b.dataset.download) downloadTrack(tracks[byKey(b.dataset.download)], b);
    else if (b.dataset.playAlbum) playIndex(tracks.findIndex(t => t.album === albums[b.dataset.playAlbum]));
    else if (b.dataset.downloadAlbum) downloadAlbum(albums[b.dataset.downloadAlbum], b);
  });

  // ---------- Downloads: credit and licence go into the MP3 tags (ID3v2.3) and CREDITS.txt ----------
  const enc = new TextEncoder();
  const concat = parts => {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  };
  const latin1 = s => Uint8Array.from(String(s), c => { const n = c.charCodeAt(0); return n < 256 ? n : 63; });
  function utf16(s, terminate) {
    const b = new Uint8Array(2 + s.length * 2 + (terminate ? 2 : 0));
    b[0] = 0xff; b[1] = 0xfe;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); b[2 + i * 2] = c & 255; b[3 + i * 2] = c >> 8; }
    return b;
  }
  function frame(id, body) {
    const head = new Uint8Array(10);
    head.set(latin1(id));
    new DataView(head.buffer).setUint32(4, body.length);
    return concat([head, body]);
  }
  const textFrame = (id, s) => frame(id, concat([Uint8Array.of(1), utf16(s)]));
  const urlFrame = (id, url) => frame(id, latin1(encodeURI(decodeURI(url))));
  const commentFrame = s => frame('COMM', concat([Uint8Array.of(1), latin1('eng'), utf16('', true), utf16(s)]));
  const pictureFrame = jpeg => frame('APIC', concat([Uint8Array.of(0), latin1('image/jpeg'), Uint8Array.of(0, 3, 0), jpeg]));

  function creditLine(t) {
    const l = licenceOf(t);
    return `"${t.track.title}" by ${t.album.artist}, from the album "${t.album.title}". Licensed under ${l.name} (${l.url}). Source: ${sourceOf(t)}`;
  }
  function tagMp3(bytes, t, number, cover) {
    // Remove any existing ID3v2 tags at the start, then write a fresh one. The audio itself is untouched.
    let start = 0;
    while (bytes[start] === 0x49 && bytes[start + 1] === 0x44 && bytes[start + 2] === 0x33) {
      const size = (bytes[start + 6] << 21) | (bytes[start + 7] << 14) | (bytes[start + 8] << 7) | bytes[start + 9];
      start += 10 + size + (bytes[start + 5] & 0x10 ? 10 : 0);
    }
    const l = licenceOf(t);
    const frames = [
      textFrame('TIT2', t.track.title),
      textFrame('TPE1', t.album.artist),
      textFrame('TALB', t.album.title),
      textFrame('TRCK', `${number}/${t.album.tracks.length}`),
      textFrame('TCOP', `${t.album.year ? t.album.year + ' ' : ''}${t.album.artist}. Licensed under ${l.name}: ${l.url}`),
      urlFrame('WCOP', l.url),
      urlFrame('WOAS', sourceOf(t)),
      commentFrame(`${creditLine(t)}. Downloaded from Deep Space Radio, ${SITE}`)
    ];
    if (t.album.year) frames.push(textFrame('TYER', String(t.album.year)));
    if (t.album.label) frames.push(textFrame('TPUB', t.album.label));
    if (cover) frames.push(pictureFrame(cover));
    const body = concat(frames);
    const n = body.length;
    const header = Uint8Array.of(0x49, 0x44, 0x33, 3, 0, 0, (n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127);
    return concat([header, body, bytes.subarray(start)]);
  }
  function creditsText(album, onlyTrack) {
    const lines = [
      `${album.title}`, `by ${album.artist}`, '',
      `Licence: ${album.licence.name}`, `Licence text: ${album.licence.url}`,
      `Source: ${album.source}`
    ];
    if (album.year) lines.push(`Year: ${album.year}`);
    if (album.label) lines.push(`Label: ${album.label}`);
    if (album.licenceNote) lines.push('', `Note: ${album.licenceNote}`);
    lines.push('', 'Tracks:');
    album.tracks.forEach((track, i) => {
      if (onlyTrack && onlyTrack !== track) return;
      lines.push(`${String(i + 1).padStart(2, '0')}. ${track.title} (${track.duration})${track.licence ? ` [${track.licence.name}: ${track.licence.url}]` : ''}`);
    });
    lines.push('', `This music is by ${album.artist}, not Johnny Mandious. You can share it under the licence above; credit the artist and link the licence.`, `Downloaded from Deep Space Radio, ${SITE}`, '');
    return lines.join('\r\n');
  }
  const safeName = s => s.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  function save(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {href: url, download: name});
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function fetchBytes(url) {
    const r = await fetch(url, {mode: 'cors'});
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return new Uint8Array(await r.arrayBuffer());
  }
  const coverBytes = album => fetchBytes(album.cover).catch(() => null);
  function busy(button, text) {
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.setAttribute('aria-busy', String(Boolean(text)));
    button.disabled = Boolean(text);
    button.textContent = text || button.dataset.label;
  }

  async function downloadTrack(t, button) {
    if (!t || button.disabled) return;
    const number = t.album.tracks.indexOf(t.track) + 1;
    busy(button, button.classList.contains('radio-track-dl') ? '…' : 'Preparing…');
    try {
      const [bytes, cover] = await Promise.all([fetchBytes(t.track.file), coverBytes(t.album)]);
      save(new Blob([tagMp3(bytes, t, number, cover)], {type: 'audio/mpeg'}), safeName(`${t.album.artist} - ${t.track.title}`) + '.mp3');
    } catch {
      // Could not tag the file in the browser: give the credits note alongside the original file instead.
      save(new Blob([creditsText(t.album, t.track)], {type: 'text/plain'}), safeName(`${t.album.artist} - ${t.track.title} - CREDITS`) + '.txt');
      window.open(t.track.file, '_blank', 'noopener');
      toast('Opened the original file in a new tab. The credits and licence were saved as a text file.');
    } finally {
      busy(button, '');
    }
  }

  // Minimal ZIP writer (stored, no compression: MP3s don't compress anyway).
  const crcTable = Array.from({length: 256}, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
  function crc32(b) {
    let c = 0xffffffff;
    for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function zip(files) {
    const parts = [], central = [];
    let offset = 0;
    const d = new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      const local = new DataView(new ArrayBuffer(30));
      [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, time, 2], [12, date, 2], [14, crc, 4], [18, size, 4], [22, size, 4], [26, name.length, 2], [28, 0, 2]]
        .forEach(([o, v, n]) => (n === 4 ? local.setUint32(o, v, true) : local.setUint16(o, v, true)));
      const cd = new DataView(new ArrayBuffer(46));
      [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, time, 2], [14, date, 2], [16, crc, 4], [20, size, 4], [24, size, 4], [28, name.length, 2], [42, offset, 4]]
        .forEach(([o, v, n]) => (n === 4 ? cd.setUint32(o, v, true) : cd.setUint16(o, v, true)));
      parts.push(new Uint8Array(local.buffer), name, f.data);
      central.push(new Uint8Array(cd.buffer), name);
      offset += 30 + name.length + size;
    }
    const cdSize = central.reduce((n, p) => n + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    [[0, 0x06054b50, 4], [8, files.length, 2], [10, files.length, 2], [12, cdSize, 4], [16, offset, 4]]
      .forEach(([o, v, n]) => (n === 4 ? end.setUint32(o, v, true) : end.setUint16(o, v, true)));
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], {type: 'application/zip'});
  }

  async function downloadAlbum(album, button) {
    if (button.disabled) return;
    const folder = safeName(`${album.artist} - ${album.title}`);
    const albumTracks = tracks.filter(t => t.album === album);
    busy(button, 'Preparing…');
    try {
      const cover = await coverBytes(album);
      const files = [{name: `${folder}/CREDITS.txt`, data: enc.encode(creditsText(album))}];
      if (cover) files.push({name: `${folder}/cover.jpg`, data: cover});
      for (const [i, t] of albumTracks.entries()) {
        busy(button, `Track ${i + 1} of ${albumTracks.length}…`);
        const bytes = await fetchBytes(t.track.file);
        files.push({name: `${folder}/${String(i + 1).padStart(2, '0')} ${safeName(t.track.title)}.mp3`, data: tagMp3(bytes, t, i + 1, cover)});
      }
      busy(button, 'Zipping…');
      save(zip(files), folder + '.zip');
    } catch {
      save(new Blob([creditsText(album)], {type: 'text/plain'}), folder + ' - CREDITS.txt');
      window.open(album.source, '_blank', 'noopener');
      toast('The album could not be packaged here, so its source page has opened instead. The credits and licence were saved as a text file.', 6000);
    } finally {
      busy(button, '');
    }
  }

  // ---------- Start ----------
  if ('mediaSession' in navigator) {
    const handlers = {play: start, pause: () => audio.pause(), nexttrack: () => go(1, true), previoustrack: () => go(-1, true)};
    for (const [action, fn] of Object.entries(handlers)) {
      try { navigator.mediaSession.setActionHandler(action, fn); } catch {}
    }
  }

  fetch(DATA_URL)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      albums = data.albums || [];
      tracks = albums.flatMap(album => album.tracks.map((track, i) => ({album, track, key: `${album.id}/${i}`})));
      if (!tracks.length) throw new Error('empty');
      renderLibrary();
      const volume = store.get('volume');
      if (typeof volume === 'number') { audio.volume = volume; ui.volume.value = volume; }
      mode = store.get('mode') === 'shuffle' ? 'shuffle' : 'normal';
      modeButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
      const saved = tracks.findIndex(t => t.key === store.get('track'));
      buildOrder(saved >= 0 ? saved : mode === 'shuffle' ? Math.floor(Math.random() * tracks.length) : 0);
      load(false);
    })
    .catch(() => {
      ui.title.textContent = 'The radio could not load its music list.';
      ui.status.textContent = 'Off air';
      [ui.play, ui.prev, ui.next, ui.download].forEach(b => { b.disabled = true; });
    });
})();
