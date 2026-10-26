export const icons = { wear: 'outfit-set', home: 'wardrobe-keep', wardrobe: 'garment-single', add: 'photo-add', sets: 'outfit-set', review: 'review-cycle', archive: 'archive-box', keep: 'wardrobe-keep' };
export function icon(name, className = '') { return `<img class="art-icon ${className}" src="/art/icons/${icons[name] || 'garment-single'}.png" alt="" width="32" height="32">`; }
