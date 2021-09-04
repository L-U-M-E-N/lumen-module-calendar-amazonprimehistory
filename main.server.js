const fs = require('fs');
const path = require('path');

const FILENAME = path.join(process.cwd(), 'res/amazon/Digital.PrimeVideo.ViewingHistory.csv');

module.exports = class AmazonCalendar {
	static init() {
		AmazonCalendar.importAmazonPrimeVideoActivity();

		const watcher = fs.watch(FILENAME, { persistent: false }, (curr, prev) => {
			watcher.close();

			log('./reloading.STATS.AmazonPrime', 'boot');

			AmazonCalendar.importAmazonPrimeVideoActivity();
		});
	}

	static async importAmazonPrimeVideoActivity() {
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

				Database.execQuery(
					query,
					values
				);
			}
		}

		log('Saved Amazon Activity', 'info');
	}
};