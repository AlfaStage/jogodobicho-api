export class NumerologyService {
    private table: Record<string, number> = {
        'a': 1, 'j': 1, 's': 1,
        'b': 2, 'k': 2, 't': 2,
        'c': 3, 'l': 3, 'u': 3,
        'd': 4, 'm': 4, 'v': 4,
        'e': 5, 'n': 5, 'w': 5,
        'f': 6, 'o': 6, 'x': 6,
        'g': 7, 'p': 7, 'y': 7,
        'h': 8, 'q': 8, 'z': 8,
        'i': 9, 'r': 9
    };

    calculate(name: string): any {
        const cleanName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '');
        let sum = 0;
        const details = [];

        for (const char of cleanName) {
            const val = this.table[char] || 0;
            sum += val;
            details.push(`${char}=${val}`);
        }

        const luckyNumber = this.reduceToSingleDigit(sum);

        return {
            input: name,
            cleanInput: cleanName,
            sum,
            luckyNumber,
            details: details.join(', '),
            meaning: this.getMeaning(luckyNumber)
        };
    }

    private reduceToSingleDigit(num: number): number {
        while (num > 9) {
            num = num.toString().split('').reduce((acc, curr) => acc + parseInt(curr), 0);
        }
        return num;
    }

    private getMeaning(num: number): string {
        const meanings: Record<number, string> = {
            1: "Liderança, independência, originalidade.",
            2: "Cooperação, diplomacia, paciência.",
            3: "Comunicação, criatividade, otimismo.",
            4: "Organização, trabalho duro, estabilidade.",
            5: "Liberdade, aventura, mudanças.",
            6: "Responsabilidade, amor, harmonia.",
            7: "Análise, introspecção, sabedoria.",
            8: "Poder, sucesso material, eficiência.",
            9: "Humanitarismo, compaixão, generosidade."
        };
        return meanings[num] || "Número mestre ou indefinido.";
    }
}
