import captionsAr from "../captions-ar.json";
import captionsEn from "../captions.json";
import { CAIRO, FRAUNCES, INTER } from "../fonts";
import { defaultStory } from "../story";

// Words, voiceover and fonts per language of the 3D film. Label texts follow the order of
// `labels` in src/remake/config.ts; null keeps the config text.

export type Lang = "en" | "ar";
export type Cue = { speaker: string; text: string; start: number; end: number };

type LangPack = {
  dir: "ltr" | "rtl";
  titleFont: string;
  bodyFont: string;
  voDir: string; // folder in public/
  captions: Cue[][];
  titles: string[];
  labels: (string | null)[][];
  intro: string;
  outro: { headline: string; subline: string; contacts: string[] };
};

const o = defaultStory.outro;

export const LANG: Record<Lang, LangPack> = {
  en: {
    dir: "ltr",
    titleFont: FRAUNCES,
    bodyFont: INTER,
    voDir: "vo",
    captions: captionsEn as Cue[][],
    titles: defaultStory.steps.map((s) => s.title),
    labels: [],
    intro: defaultStory.introTitle,
    outro: { headline: o.headline, subline: o.subline, contacts: [`WhatsApp / Call: ${o.whatsapp}`, o.website, o.email] },
  },
  ar: {
    dir: "rtl",
    titleFont: CAIRO,
    bodyFont: CAIRO,
    voDir: "vo-ar",
    captions: captionsAr as Cue[][],
    titles: [
      "نخيل قديم بلا ثمر",
      "عبء ثقيل",
      "أريبس تتدخل",
      "جذوع تدخل، بالم بيت يخرج",
      "معبّأ بعناية",
      "العودة إلى المزرعة",
      "تربة تحتفظ بالماء",
      "حصاد جديد",
      "عُمان أكثر خضرة",
    ],
    labels: [
      ["لا تمر هذا العام…", "بلا ثمر"],
      ["ماذا أفعل بهذه؟"],
      ["→\u200F مصنع أريبس، بركاء", "أريبس ستحمل عنك العبء"],
      ["جذوع النخيل تدخل", "بالم بيت يخرج"],
      ["كيس محكم ٢٠٠ لتر", "سائب · كيلو / طن"],
      ["→\u200F إلى المزرعة", "أهلًا بعودتكم!"],
      ["يحتفظ بماء أكثر"],
      ["حصاد جديد"],
      ["عُمان أكثر خضرة", "شكرًا أريبس!"],
    ],
    intro: "من عبءٍ إلى تربةٍ أفضل",
    outro: {
      headline: "أريبس بالم بيت — صُنع في عُمان",
      subline: "محسّن تربة عضوي طبيعي ١٠٠٪",
      contacts: [`واتساب / اتصال: ‎${o.whatsapp}`, o.website, o.email],
    },
  },
};

export const voDuration = (lang: Lang, index: number) => {
  const cues = LANG[lang].captions[index] ?? [];
  return cues.length ? cues[cues.length - 1].end : 0;
};
