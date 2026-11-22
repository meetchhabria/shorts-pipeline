// Scene router: ?scene=pigwar (hand-built Pig War short) or ?scene=kit (data-driven director reading film/shots.json).
const s = new URLSearchParams(location.search).get('scene') || 'pigwar';
await import(s === 'kit' ? './director.js' : './main.pigwar.js');
