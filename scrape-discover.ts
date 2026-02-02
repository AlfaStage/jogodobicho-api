import axios from 'axios';
import * as cheerio from 'cheerio';

async function main() {
    try {
        console.log('Fetching mapa-do-site...');
        const { data } = await axios.get('https://www.ojogodobicho.com/mapa-do-site.htm', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);

        console.log('--- Links Found ---');
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && (href.includes('.htm') || href.includes('.php'))) {
                console.log(`${text} -> ${href}`);
            }
        });

    } catch (err) {
        console.error(err);
    }
}

main();
