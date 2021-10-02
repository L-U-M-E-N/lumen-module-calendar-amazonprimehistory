import fs from 'fs';
import path from 'path';

const FILENAME = path.join(process.cwd(), 'res/amazon/Digital.PrimeVideo.ViewingHistory.csv');

export default class AmazonCalendar {
	static init() {
		AmazonCalendar.importAmazonPrimeVideoActivity();

		const watcher = fs.watch(FILENAME, { persistent: false }, (curr, prev) => {
			watcher.close();

			log('./reloading.STATS.AmazonPrime', 'boot');

			AmazonCalendar.importAmazonPrimeVideoActivity();
		});
	}

	static async importAmazonPrimeVideoActivity() {
		const minDate = (await Database.execQuery(
				'SELECT MAX(start) as min FROM calendar WHERE title = $1', ['PrimeVideo']
			)).rows[0].min;
		minDate.setHours(minDate.getHours() - 6); // Safety margin

		const file = fs.readFileSync(FILENAME).toString();

		let firstLineSkipped = false;
		for(const line of file.split('\n')) {
			if(!firstLineSkipped || line === '') {
				firstLineSkipped = true;
				continue;
			}

			const elements = line.split(',');

			const startElements = elements[0].split(' ');
			const startDateElements = startElements[0].split('/');
			const start = new Date(`${startDateElements[2]}-${startDateElements[0]}-${startDateElements[1]}T${startElements[1]}Z`);
			const end = new Date(start);
			end.setHours(end.getHours() + 1);

			if(start.getTime() <= minDate.getTime()) {
				continue;
			}

			const id = 'PrimeVideo-' + start;

			const field = {
				id: id,
				title: 'PrimeVideo',
				description: elements[12],
				start,
				end,
				origin: ''
			};

			//console.log(field);

			if((await Database.execQuery('SELECT id FROM calendar WHERE id = $1', [id])).rows.length === 0) {
				const [query, values] = Database.buildInsertQuery('calendar', field);

				await Database.execQuery(
					query,
					values
				);
			}
		}

		log('Saved Amazon Activity', 'info');
	}
};