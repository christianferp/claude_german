import { firstLetterMask } from '../../lib/mask';
import { tokenize } from '../../lib/textTokens';

interface MaskedPhraseProps {
  text: string;
  /** 'cloze' hides only hiddenIndices; 'letters' masks every word. */
  mode: 'cloze' | 'letters';
  hiddenIndices: Set<number>;
  revealed: Set<number>;
  onReveal: (wordIndex: number) => void;
}

/**
 * The phrase with some words hidden as tappable blanks. Blanks contain the
 * real word rendered transparent, so they are exactly word-width and the
 * layout never shifts on reveal. Punctuation (incl. ¿¡) stays visible.
 */
export function MaskedPhrase({ text, mode, hiddenIndices, revealed, onReveal }: MaskedPhraseProps) {
  return (
    <p className="text-[1.7rem] font-bold leading-snug text-slate-800">
      {tokenize(text).map((token, i) => {
        if (!token.isWord) return <span key={i}>{token.raw}</span>;
        const isHidden = mode === 'letters' || hiddenIndices.has(token.wordIndex);
        if (!isHidden || revealed.has(token.wordIndex)) {
          return <span key={i}>{token.raw}</span>;
        }
        if (mode === 'letters') {
          return (
            <button
              key={i}
              onClick={() => onReveal(token.wordIndex)}
              className="rounded-lg px-0.5 tracking-wide text-slate-300 active:bg-sage-50"
              aria-label="Masked word — tap to reveal"
            >
              <span className="text-slate-800">{[...token.raw][0]}</span>
              {firstLetterMask(token.raw).slice(1)}
            </button>
          );
        }
        return (
          <button
            key={i}
            onClick={() => onReveal(token.wordIndex)}
            className="select-none rounded-lg bg-sage-100 px-1 text-transparent active:bg-sage-200"
            aria-label="Hidden word — tap to reveal"
          >
            {token.raw}
          </button>
        );
      })}
    </p>
  );
}
