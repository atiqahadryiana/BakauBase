// Standalone prototype handles. Vite aliases Firebase's Firestore and Storage
// imports to browser-local adapters in src/demo, so no project or API key is
// required to run the competition demo.
export const db = Object.freeze({ mode: 'local-prototype' });
export const storage = Object.freeze({ mode: 'local-prototype' });

export default Object.freeze({ mode: 'local-prototype' });
