// get type, often this will always be "post"
// but can also be "page" or other custom types
module.exports = (post) => {
	try {
		// console.warn(post.data);
		// console.error(post.wpdiscuz_post_rating);
		console.warn(post.data.title + ' has a rating of ' + post.wpdiscuz_post_rating + ' with ' + post.wpdiscuz_post_rating_count + ' ratings.');
		return post.wpdiscuz_post_rating;
	} catch (error) {
		console.error(post.data.title + ' had an error in wpdisduz_post_rating.js:' + error);
		// console.info(post);
		return '';
	}
}
