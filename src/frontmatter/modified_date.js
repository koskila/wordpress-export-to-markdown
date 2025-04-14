const luxon = require('luxon');

const settings = require('../settings');

// get post date, optionally formatted as specified in settings
// this value is also used for year/month folders, date prefixes, etc. as needed
module.exports = (post) => {

	// console.log("Parsing modified date: ");
	// console.log(post.data);

	const dateTime = luxon.DateTime.fromFormat(post.data.post_modified[0], 'yyyy-MM-dd HH:mm:ss', { zone: settings.custom_date_timezone });

	// console.log("Parsed modified date: " + dateTime);

	if (settings.custom_date_formatting) {
		return dateTime.toFormat(settings.custom_date_formatting);
	} else if (settings.include_time_with_date) {
		return dateTime.toISO();
	} else {
		return dateTime.toISODate();
	}
};
