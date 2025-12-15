import { ValidationResult } from './core/types';
import { Linter } from './modules/linter';

export class BahasaStyle {
    private static linter = new Linter();

    static validate(text: string): ValidationResult {
        return this.linter.validate(text);
    }
}
