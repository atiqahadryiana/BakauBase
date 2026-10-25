/**
 * Admin.jsx – Administration page for BakauBase.
 *
 * Requires admin role. Two sections:
 *
 * 1. User Management
 *    - Lists all users from 'users' collection.
 *    - Dropdown to change role, save button per row.
 *
 * 2. Species Management
 *    - Lists all species from 'species' collection.
 *    - Expandable carbon-factors table per species.
 *    - Add / edit / delete species (with carbon factors editor).
 *
 * All UI strings through t() for i18n.
 */

import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { useLang } from '../contexts/LanguageContext.jsx';
import { ROLES } from '../config.js';

/* ───────── colour tokens ───────── */
const DEEP_GREEN  = '#1F3A2B';
const LEAF_GREEN  = '#5B7B4A';
const CREAM       = '#F3F1E6';
const MAROON      = '#8C4C43';
const LIGHT_GREEN = '#F8F7EF';

/* ───────── inline styles ───────── */
const s = {
  page: {
    width: 'min(1100px, 100%)',
    margin: '0 auto',
    padding: 'clamp(1rem, 3vw, 2rem)',
  },
  heading: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: DEEP_GREEN,
    marginBottom: '1.5rem',
  },
  section: {
    background: '#fff',
    borderRadius: '10px',
    padding: '1.5rem',
    border: '1px solid #d7ddd8',
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: DEEP_GREEN,
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
  },
  th: {
    textAlign: 'left',
    padding: '0.6rem 0.75rem',
    background: '#D6E4D0',
    color: DEEP_GREEN,
    fontWeight: 600,
  },
  td: {
    padding: '0.6rem 0.75rem',
    borderBottom: '1px solid #e0e0e0',
    verticalAlign: 'middle',
  },
  select: {
    padding: '0.35rem 0.5rem',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '0.85rem',
  },
  btnSm: (bg = LEAF_GREEN, clr = '#fff') => ({
    padding: '0.35rem 0.75rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: clr,
    background: bg,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginLeft: '0.35rem',
  }),
  btnPrimary: {
    padding: '0.6rem 1.25rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#fff',
    background: LEAF_GREEN,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '0.75rem',
  },
  input: {
    padding: '0.5rem 0.6rem',
    border: '1px solid #ccc',
    borderRadius: '6px',
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box',
  },
  inputSm: {
    padding: '0.3rem 0.4rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '0.8rem',
    width: '80px',
    textAlign: 'center',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#555',
    marginBottom: '0.25rem',
  },
  expandBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.85rem',
    color: DEEP_GREEN,
    fontWeight: 600,
    textDecoration: 'underline',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    background: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: '0 8px 24px rgba(23,63,50,0.18)',
  },
  msg: (type) => ({
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    marginBottom: '0.75rem',
    background: type === 'error' ? '#fdecea' : LIGHT_GREEN,
    color: type === 'error' ? MAROON : DEEP_GREEN,
  }),
  noAccess: {
    textAlign: 'center',
    padding: '4rem 1rem',
    color: MAROON,
    fontSize: '1.1rem',
  },
};

/* ═══════════════════════════════════════════════
   MAIN ADMIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function Admin() {
  const { t } = useLang();

  return (
    <div style={s.page} className="admin-page">
      <header className="field-page-heading">
        <p className="section-kicker">{t('nav.demoMode')}</p>
        <h1>{t('adminPanel')}</h1>
        <p>{t('carbon.note')}</p>
      </header>
      <SpeciesManagement />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   USER MANAGEMENT
   ═══════════════════════════════════════════════ */
function UserManagement() {
  const { t } = useLang();
  const [users, setUsers]     = useState([]);
  const [saving, setSaving]   = useState({});
  const [msg, setMsg]         = useState(null);

  /* ── Load users ── */
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), orderBy('name')));
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Admin: failed to load users', err);
      }
    })();
  }, []);

  /* ── Change role locally ── */
  const handleRoleChange = (uid, newRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === uid ? { ...u, role: newRole } : u)),
    );
  };

  /* ── Save role ── */
  const saveRole = async (uid, role) => {
    setSaving((prev) => ({ ...prev, [uid]: true }));
    setMsg(null);
    try {
      await updateDoc(doc(db, 'users', uid), { role });
      setMsg({ type: 'success', text: t('roleSaved') });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving((prev) => ({ ...prev, [uid]: false }));
    }
  };

  return (
    <div style={s.section}>
      <div style={s.sectionTitle}>{t('userManagement')}</div>

      {msg && <div style={s.msg(msg.type)}>{msg.text}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>{t('name')}</th>
              <th style={s.th}>{t('email')}</th>
              <th style={s.th}>{t('role')}</th>
              <th style={s.th}>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : LIGHT_GREEN }}>
                <td style={s.td}>{u.name || u.displayName || '—'}</td>
                <td style={s.td}>{u.email || u.displayName || '—'}</td>
                <td style={s.td}>
                  <select
                    style={s.select}
                    value={u.role || 'volunteer'}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  >
                    {Object.values(ROLES).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={s.td}>
                  <button
                    style={s.btnSm()}
                    disabled={saving[u.id]}
                    onClick={() => saveRole(u.id, u.role)}
                  >
                    {saving[u.id] ? '...' : t('save')}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} style={{ ...s.td, textAlign: 'center', color: '#999' }}>
                  {t('noUsersFound')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SPECIES MANAGEMENT
   ═══════════════════════════════════════════════ */
function SpeciesManagement() {
  const { t } = useLang();
  const [species, setSpecies]     = useState([]);
  const [expanded, setExpanded]   = useState({});  // id -> bool
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null); // species obj or null
  const [msg, setMsg]             = useState(null);

  /* ── Load species ── */
  const loadSpecies = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'species'), orderBy('localName')),
      );
      setSpecies(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Admin: failed to load species', err);
    }
  };

  useEffect(() => {
    loadSpecies();
  }, []);

  /* ── Toggle expand ── */
  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  /* ── Delete species ── */
  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmDeleteSpecies'))) return;
    try {
      await deleteDoc(doc(db, 'species', id));
      setSpecies((prev) => prev.filter((sp) => sp.id !== id));
      setMsg({ type: 'success', text: t('speciesDeleted') });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  /* ── Open edit ── */
  const openEdit = (sp) => {
    setEditing(sp);
    setShowForm(true);
  };

  /* ── Open add ── */
  const openAdd = () => {
    setEditing(null);
    setShowForm(true);
  };

  return (
    <section style={s.section} className="admin-section" aria-labelledby="species-management-title">
      <div style={s.sectionTitle} id="species-management-title">{t('speciesManagement')}</div>

      {msg && <div style={s.msg(msg.type)} role="status" aria-live="polite">{msg.text}</div>}

      <div className="table-scroll" tabIndex="0" aria-label={t('speciesManagement')}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>{t('localName')}</th>
              <th style={s.th}>{t('scientificName')}</th>
              <th style={s.th}>{t('carbonFactors')}</th>
              <th style={s.th}>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {species.map((sp, i) => (
              <React.Fragment key={sp.id}>
                <tr style={{ background: i % 2 === 0 ? '#fff' : LIGHT_GREEN }}>
                  <td style={s.td}>{sp.localName}</td>
                  <td style={s.td}>
                    <em>{sp.scientificName}</em>
                  </td>
                  <td style={s.td}>
                    <button
                      style={s.expandBtn}
                      onClick={() => toggleExpand(sp.id)}
                      aria-expanded={Boolean(expanded[sp.id])}
                    >
                      <svg className={`table-chevron ${expanded[sp.id] ? 'is-open' : ''}`} viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
                      {t('viewFactors')}
                    </button>
                  </td>
                  <td style={s.td}>
                    <button style={s.btnSm()} onClick={() => openEdit(sp)}>
                      {t('edit')}
                    </button>
                    <button
                      style={s.btnSm(MAROON)}
                      onClick={() => handleDelete(sp.id)}
                    >
                      {t('delete')}
                    </button>
                  </td>
                </tr>

                {/* Expanded carbon factors */}
                {expanded[sp.id] && (
                  <tr>
                    <td colSpan={4} style={{ padding: '0.75rem 1.5rem', background: '#fafafa' }}>
                      <CarbonFactorsReadOnly factors={sp.carbonFactors || {}} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {species.length === 0 && (
              <tr>
                <td colSpan={4} style={{ ...s.td, textAlign: 'center', color: '#999' }}>
                  {t('noSpeciesFound')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button style={s.btnPrimary} className="btn-primary" onClick={openAdd}>
        {t('addSpecies')}
      </button>

      {/* ── Species Form Modal ── */}
      {showForm && (
        <SpeciesFormModal
          existing={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            loadSpecies();
            setMsg({ type: 'success', text: t('speciesSaved') });
          }}
        />
      )}
    </section>
  );
}

/* ── Read-only carbon factors display ── */
function CarbonFactorsReadOnly({ factors }) {
  const { t } = useLang();
  const ages = Object.keys(factors)
    .map(Number)
    .sort((a, b) => a - b);

  if (ages.length === 0) {
    return <em style={{ color: '#999' }}>{t('noFactors')}</em>;
  }

  return (
    <table style={{ ...s.table, maxWidth: '400px', fontSize: '0.8rem' }}>
      <thead>
        <tr>
          <th style={{ ...s.th, padding: '0.4rem 0.5rem', fontSize: '0.75rem' }}>
            {t('ageYears')}
          </th>
          <th style={{ ...s.th, padding: '0.4rem 0.5rem', fontSize: '0.75rem' }}>
            {t('tCPerTree')}
          </th>
        </tr>
      </thead>
      <tbody>
        {ages.map((age) => (
          <tr key={age}>
            <td style={{ ...s.td, padding: '0.3rem 0.5rem' }}>{age}</td>
            <td style={{ ...s.td, padding: '0.3rem 0.5rem' }}>{factors[age]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ═══════════════════════════════════════════════
   SPECIES FORM MODAL (Add / Edit)
   ═══════════════════════════════════════════════ */
function SpeciesFormModal({ existing, onClose, onSaved }) {
  const { t } = useLang();

  const isEdit = !!existing;

  const [scientificName, setScientificName] = useState(existing?.scientificName || '');
  const [localName, setLocalName]           = useState(existing?.localName || '');
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState('');

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  /* ── Carbon factors state: { age: tCValue } ── */
  const buildInitialFactors = () => {
    if (existing?.carbonFactors && Object.keys(existing.carbonFactors).length > 0) {
      // Convert existing factors to array of { age, value } sorted by age
      return Object.entries(existing.carbonFactors)
        .map(([age, value]) => ({ age: Number(age), value: Number(value) }))
        .sort((a, b) => a.age - b.age);
    }
    // Default: ages 1-30 with 0 placeholder
    // TODO: Replace placeholder carbon factor values with actual species-specific data
    return Array.from({ length: 30 }, (_, i) => ({
      age: i + 1,
      value: 0,
    }));
  };

  const [factors, setFactors] = useState(buildInitialFactors);

  const updateFactor = (index, field, raw) => {
    setFactors((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, [field]: field === 'value' ? parseFloat(raw) || 0 : parseInt(raw) || 0 } : f,
      ),
    );
  };

  /* ── Submit ── */
  const handleSave = async () => {
    setError('');
    if (!scientificName.trim() || !localName.trim()) {
      setError(t('fillAllFields'));
      return;
    }

    setSaving(true);
    try {
      // Build carbon factors map
      const carbonFactors = {};
      factors.forEach((f) => {
        if (f.age > 0) {
          carbonFactors[f.age] = f.value;
        }
      });

      const data = {
        scientificName: scientificName.trim(),
        localName: localName.trim(),
        carbonFactors,
      };

      if (isEdit) {
        await updateDoc(doc(db, 'species', existing.id), data);
      } else {
        // Use scientific name (lowered, no spaces) as doc ID
        const docId =
          scientificName.trim().toLowerCase().replace(/\s+/g, '_');
        await setDoc(doc(db, 'species', docId), data);
      }

      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.overlay} className="modal-overlay" onClick={onClose}>
      <div style={s.modal} className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="species-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-heading-row">
        <h2 id="species-modal-title" style={{ color: DEEP_GREEN, marginTop: 0 }}>
          {isEdit ? t('editSpecies') : t('addSpecies')}
        </h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label={t('cancel')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19" /></svg></button>
        </div>

        {error && <div style={s.msg('error')} role="alert">{error}</div>}

        <div style={s.formGrid}>
          <div>
            <label style={s.label} htmlFor="species-scientific-name">{t('scientificName')}</label>
            <input
              id="species-scientific-name"
              style={s.input}
              value={scientificName}
              onChange={(e) => setScientificName(e.target.value)}
              placeholder="e.g. Rhizophora mucronata"
            />
          </div>
          <div>
            <label style={s.label} htmlFor="species-local-name">{t('localName')}</label>
            <input
              id="species-local-name"
              style={s.input}
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="e.g. Bakau"
            />
          </div>
        </div>

        {/* ── Carbon Factors Table ── */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ ...s.label, marginBottom: '0.5rem' }}>
            {t('carbonFactors')}
          </label>
          {/* TODO: Carbon factor values should be sourced from verified literature or field data */}
          <div
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
            }}
          >
            <table style={{ ...s.table, fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ ...s.th, padding: '0.4rem 0.5rem', fontSize: '0.75rem', position: 'sticky', top: 0 }}>
                    {t('ageYears')}
                  </th>
                  <th style={{ ...s.th, padding: '0.4rem 0.5rem', fontSize: '0.75rem', position: 'sticky', top: 0 }}>
                    {t('tCPerTree')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {factors.map((f, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...s.td, padding: '0.25rem 0.5rem' }}>
                      <input
                        style={s.inputSm}
                        type="number"
                        min="1"
                        max="100"
                        value={f.age}
                        onChange={(e) => updateFactor(idx, 'age', e.target.value)}
                      />
                    </td>
                    <td style={{ ...s.td, padding: '0.25rem 0.5rem' }}>
                      <input
                        style={s.inputSm}
                        type="number"
                        min="0"
                        step="0.0001"
                        value={f.value}
                        onChange={(e) => updateFactor(idx, 'value', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            className="btn-secondary"
            style={{ marginTop: '0.75rem' }}
            onClick={onClose}
          >
            {t('cancel')}
          </button>
          <button
            style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '...' : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
