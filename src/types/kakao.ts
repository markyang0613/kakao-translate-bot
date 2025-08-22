import { z } from "zod";

export const KakaoRequestSchema = z.object({
  userRequest: z.object({
    utterance: z.string().min(1, "Empty message"),
    user: z.any().optional()
  })
});

export type KakaoRequest = z.infer<typeof KakaoRequestSchema>;

export type KakaoSimpleTextResponse = {
  version: "2.0";
  template: {
    outputs: Array<{
      simpleText: { text: string };
    }>;
  };
};

export function simpleText(text: string): KakaoSimpleTextResponse {
  return {
    version: "2.0",
    template: {
      outputs: [{ simpleText: { text } }]
    }
  };
}
