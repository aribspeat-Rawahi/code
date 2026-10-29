import { z } from "zod";

// All words in the video. Edit them here or in the Remotion Studio props panel.
// Scene order and drawings are fixed (src/art/scenes.tsx); text and labels are free.

const labelsSchema = z.object({
  bubble: z.string().optional(),
  sign: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const storySchema = z.object({
  introTitle: z.string(),
  steps: z
    .array(
      z.object({
        title: z.string(),
        text: z.string(),
        labels: labelsSchema,
      }),
    )
    .length(9),
  outro: z.object({
    headline: z.string(),
    subline: z.string(),
    whatsapp: z.string(),
    website: z.string(),
    email: z.string(),
  }),
  // Background music: public/music/{tender,hope,uplift}.mp3 follow the story's mood (scripts/audio.py).
  music: z.object({
    enabled: z.boolean(),
    volume: z.number().min(0).max(1),
  }),
  // Transition whooshes, pops and scene sounds from public/sfx/
  sfx: z.object({
    enabled: z.boolean(),
    volume: z.number().min(0).max(1),
  }),
  // Burned-in captions of the voiceover (timings in src/captions.json)
  captions: z.boolean(),
  // Plays public/vo/01.mp3 … 09.mp3 when present; scene length then follows the audio.
  voiceover: z.boolean(),
  // Filled in by calculateMetadata (src/Root.tsx); leave empty.
  voDurations: z.array(z.number().nullable()).optional(),
  musicAvailable: z.boolean().optional(),
});

export type StoryProps = z.infer<typeof storySchema>;
export type StepLabels = z.infer<typeof labelsSchema>;

export const defaultStory: StoryProps = {
  introTitle: "From burden to better soil",
  steps: [
    {
      title: "Old palms, no fruit",
      text: "An Omani farmer has a date farm full of tall, old palms. They no longer give him good fruit.",
      labels: { bubble: "No dates this year…", tags: ["No fruit"] },
    },
    {
      title: "A heavy burden",
      text: "He cuts them down, but now the trunks just lie there. What can he do with them? They have become a burden on his mind.",
      labels: { bubble: "What do I do with these?" },
    },
    {
      title: "ARIBS steps in",
      text: "We collect the palms from his farm and bring them to our factory in our own covered vans.",
      labels: { sign: "→ ARIBS Factory, Barka", bubble: "ARIBS will take your burden" },
    },
    {
      title: "Palm in, peat out",
      text: "At our factory in Barka, palm trunks go in one side and come out the other as palm peat.",
      labels: { tags: ["Palm trunks IN", "Palm peat OUT"] },
    },
    {
      title: "Packed with care",
      text: "The palm peat is packed in sealed 200 L bags, or supplied loose by KG and Ton.",
      labels: { tags: ["200 L sealed bag", "Loose · KG / Ton"] },
    },
    {
      title: "Back to the farm",
      text: "It goes back to farmers, even to the same farmer who gave us his trees.",
      labels: { sign: "→ To the farm", bubble: "Welcome back!" },
    },
    {
      title: "Soil that holds water",
      text: "Mixed into his soil as a natural soil improver, it helps the soil hold more water.",
      labels: { tags: ["Holds more water"] },
    },
    {
      title: "A new harvest",
      text: "With better soil, his new crops have what they need to grow.",
      labels: { sign: "New harvest" },
    },
    {
      title: "A greener Oman",
      text: "What was waste and worry becomes a reason to smile. That is how ARIBS helps make Oman greener, one palm at a time.",
      labels: { sign: "A Greener Oman", bubble: "Shukran, ARIBS!" },
    },
  ],
  outro: {
    headline: "ARIBS Palm Peat — Made in Oman",
    subline: "100% natural organic soil improver",
    whatsapp: "+968 9566 4574",
    website: "aribs.net",
    email: "sales@aribs.net",
  },
  music: { enabled: true, volume: 0.3 },
  sfx: { enabled: true, volume: 1 },
  captions: true,
  voiceover: true,
};
