const key='matchxi-desktop-mode';
export function desktopMode(){try{const saved=localStorage.getItem(key);if(saved!==null)return saved==='on'}catch{}return navigator.maxTouchPoints>0&&screen.width<900&&window.innerWidth>screen.width*1.25}
export function viewportContent(desktop:boolean,width:number,touch:boolean){return `width=${desktop?'1100':touch&&width>0&&width<900?Math.round(width):'device-width'}, initial-scale=1.0, viewport-fit=cover`}
export function applyDisplayMode(desktop:boolean){document.querySelector('meta[name="viewport"]')?.setAttribute('content',viewportContent(desktop,screen.width,navigator.maxTouchPoints>0));document.documentElement.dataset.displayMode=desktop?'desktop':'responsive'}
export function setDisplayMode(desktop:boolean){try{localStorage.setItem(key,desktop?'on':'off')}catch{}applyDisplayMode(desktop)}
export function initializeDisplayMode(){try{const saved=localStorage.getItem(key);if(saved!==null)applyDisplayMode(saved==='on')}catch{}window.addEventListener('orientationchange',()=>setTimeout(()=>applyDisplayMode(desktopMode()),100))}
