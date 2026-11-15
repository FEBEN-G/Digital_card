import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import qrcode from 'qrcode-generator';
import { sendPhoto, sendRsvp, shrinkPhoto } from '../tiri';
import './RsvpSection.css';

const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.9 },
};

/** QR code for this page's RSVP, as an SVG string. */
function useRsvpQr() {
  return useMemo(() => {
    const link = `${window.location.origin}${window.location.pathname}#rsvp`;
    const q = qrcode(0, 'M');
    q.addData(link);
    q.make();
    return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }).replace(/fill="#000000"/g, 'fill="#2D241E"');
  }, []);
}

function RsvpForm() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [answer, setAnswer] = useState('');
  const [party, setParty] = useState(1);
  const [message, setMessage] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [hint, setHint] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setHint(t('rsvp_need_name'));
    if (!answer) return setHint(t('rsvp_need_answer'));
    setHint('');
    setState('sending');
    try {
      const res = await sendRsvp({ guestName: name.trim(), response: answer, partySize: party, message: message.trim() });
      setState(res?.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div className="rsvp-thanks" role="status">
        <p className="rsvp-thanks-title script-font">{t('rsvp_thanks_title')}</p>
        <p>{answer === 'attending' ? t('rsvp_thanks_yes') : t('rsvp_thanks_no')}</p>
      </div>
    );
  }

  return (
    <form className="rsvp-form" onSubmit={submit} noValidate>
      <label className="rsvp-field">
        <span>{t('rsvp_name')}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" />
      </label>

      <div className="rsvp-choice" role="radiogroup" aria-label={t('rsvp_title')}>
        {[
          ['attending', t('rsvp_yes')],
          ['not_attending', t('rsvp_no')],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={answer === value}
            className={answer === value ? 'on' : ''}
            onClick={() => setAnswer(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {answer === 'attending' && (
        <label className="rsvp-field">
          <span>{t('rsvp_party')}</span>
          <select value={party} onChange={(e) => setParty(Number(e.target.value))}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      )}

      <label className="rsvp-field">
        <span>{t('rsvp_message')}</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={3} />
      </label>

      {(hint || state === 'error') && <p className="rsvp-hint" role="alert">{hint || t('rsvp_error')}</p>}

      <button className="rsvp-send" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? t('rsvp_sending') : t('rsvp_send')}
      </button>
    </form>
  );
}

function PhotoUpload() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | done | closed | error
  const [progress, setProgress] = useState(0);
  const [hint, setHint] = useState('');

  const upload = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setHint(t('rsvp_need_name'));
    if (!files.length) return setHint(t('photos_need_file'));
    setHint('');
    setState('sending');
    setProgress(0);
    try {
      for (let i = 0; i < files.length; i++) {
        const photo = await shrinkPhoto(files[i]);
        const res = await sendPhoto({ guestName: name.trim(), photo, caption: caption.trim() });
        if (!res?.ok) {
          setState(res?.reason === 'closed' ? 'closed' : 'error');
          return;
        }
        setProgress(i + 1);
      }
      setState('done');
      setFiles([]);
      setCaption('');
    } catch {
      setState('error');
    }
  };

  return (
    <form className="rsvp-form" onSubmit={upload} noValidate>
      <label className="rsvp-field">
        <span>{t('rsvp_name')}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
      </label>
      <label className="photo-pick">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            setFiles(Array.from(e.target.files || []).slice(0, 5));
            setState('idle');
          }}
        />
        <span>{files.length ? t('photos_chosen', { count: files.length }) : t('photos_pick')}</span>
      </label>
      <label className="rsvp-field">
        <span>{t('photos_caption')}</span>
        <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} />
      </label>

      {hint && <p className="rsvp-hint" role="alert">{hint}</p>}
      {state === 'closed' && <p className="rsvp-hint" role="status">{t('photos_closed')}</p>}
      {state === 'error' && <p className="rsvp-hint" role="alert">{t('photos_error')}</p>}
      {state === 'done' && <p className="rsvp-ok" role="status">{t('photos_done')}</p>}

      <button className="rsvp-send" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? t('photos_sending', { done: progress, total: files.length }) : t('photos_send')}
      </button>
    </form>
  );
}

const RsvpSection = () => {
  const { t } = useTranslation();
  const qr = useRsvpQr();

  return (
    <div className="rsvp-section" id="rsvp">
      <motion.div className="rsvp-head" {...fade}>
        <p className="rsvp-eyebrow">{t('rsvp_eyebrow')}</p>
        <h2 className="rsvp-title script-font">{t('rsvp_title')}</h2>
        <p className="rsvp-sub">{t('rsvp_by')}</p>
      </motion.div>

      <div className="rsvp-grid">
        <motion.div className="rsvp-card" {...fade}>
          <RsvpForm />
        </motion.div>

        <motion.div className="rsvp-card rsvp-qr" {...fade} transition={{ duration: 0.9, delay: 0.15 }}>
          <div className="qr-box" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="qr-title">{t('qr_title')}</p>
          <p className="qr-hint">{t('qr_hint')}</p>
        </motion.div>
      </div>

      <motion.div className="rsvp-head photos-head" {...fade}>
        <p className="rsvp-eyebrow">{t('photos_eyebrow')}</p>
        <h2 className="rsvp-title script-font">{t('photos_title')}</h2>
        <p className="rsvp-sub">{t('photos_sub')}</p>
      </motion.div>
      <motion.div className="rsvp-card photos-card" {...fade}>
        <PhotoUpload />
      </motion.div>
    </div>
  );
};

export default RsvpSection;
