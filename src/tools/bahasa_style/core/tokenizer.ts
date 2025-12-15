// @ts-ignore
import natural from 'natural';

export class BahasaTokenizer {
    static splitSentences(text: string): string[] {
        try {
            // @ts-expect-error - natural library types are inconsistent
            const tokenizer = new natural.SentenceTokenizer();
            const sentences = tokenizer.tokenize(text);
            return sentences.map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        } catch (e) {
            console.warn("natural tokenizer failed, falling back to simple split", e);
            return text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
        }
    }

    static countWords(sentence: string): number {
        // Basic word count by space splitting, robust enough for style checking
        return sentence.trim().split(/\s+/).length;
    }
}
