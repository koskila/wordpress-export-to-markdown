import * as luxon from 'luxon';

export function author(post) {
	// not decoded (WordPress doesn't allow funky characters in usernames anyway)
	// surprisingly, does not always exist (squarespace exports, for example)
	return post.data.optionalChildValue('creator');
}

// get author, without decoding
// WordPress doesn't allow funky characters in usernames anyway
export function authors(post) {
	// console.log(post.data.creator);
	if (!post.data.author) {
        return [];
    }

    const authors = post.data.author.map(author => {
        if (author === null || !author.author_login) return "null";
        return author.author_login;
    });

    return authors;
}

export function comments(post) {
	// console.log(post.data.comment);

	if (!post.data.comment) {
		return [];
	}

	const comments = post.data.comment.map(comment => {
		if (comment === null) return "null";
		return comment.comment_content[0];
	});

	return comments;

	// try {
	// 	console.log(post.data.comment);
	// 	if (!post || !post.data || !Array.isArray(post.data.comment)) return "none";

	// 	// parse comments from xml and make them a string
	// 	const comments = post.data.comment.map(comment => {
	// 		if (comment === null) return "null";
	// 		return comment;
	// 	});

	// 	return comments.join(', ').toString();
	// } catch (err) {
	// 	console.error('Error processing comments:', err);
	// 	return "none"; // Return an empty array on failure
	// }
}

export function categories(post) {
	// array of decoded category names, excluding 'uncategorized'
	const categories = post.data.children('category');
	return categories
		.filter((category) => category.attribute('domain') === 'category' && category.attribute('nicename') !== 'uncategorized')
		.map((category) => decodeURIComponent(category.attribute('nicename')));
}

export function coverImage(post) {
	// cover image filename, previously parsed and decoded
	return post.coverImage;
}

export function date(post) {
	// a luxon datetime object, previously parsed
	return post.date;

		// if (!post.data.post_date) {
		// 	console.error("No post date found for post: " + post.data.title);
		// 	return null;
		// }
	
		// const dateTime = luxon.DateTime.fromFormat(post.data.post_date[0], 'yyyy-MM-dd HH:mm:ss', { zone: settings.custom_date_timezone });
	
		// if (settings.custom_date_formatting) {
		// 	return dateTime.toFormat(settings.custom_date_formatting);
		// } else if (settings.include_time_with_date) {
		// 	return dateTime.toISO();
		// } else {
		// 	return dateTime.toISODate();
		// }
}

export function pinned(post) {
	return post.data.is_sticky === '1';
} 

export function modified_date(post) {
	const dateTime = post.post_modified;

	return dateTime;
}

export function draft(post) {
	// boolean representing the previously parsed draft status, only included when true
	return post.isDraft ? true : undefined;
}

export function status(post) {
	return post.status;
}

export function excerpt(post) {
	// not decoded, newlines collapsed
	// does not always exist (squarespace exports, for example)
	const encoded = post.data.optionalChildValue('encoded', 1);
	return encoded ? encoded.replace(/[\r\n]+/gm, ' ') : undefined;
}

export function id(post) {
	// previously parsed as a string, converted to integer here
	return parseInt(post.id);
}

export function slug(post) {
	// previously parsed and decoded
	return post.slug;
}

export function tags(post) {
	// array of decoded tag names (yes, they come from <category> nodes, not a typo)
	const categories = post.data.children('category');
	return categories
		.filter((category) => category.attribute('domain') === 'post_tag')
		.map((category) => decodeURIComponent(category.attribute('nicename')));
}

export function title(post) {
	// not decoded
	return post.data.childValue('title');
}

export function type(post) {
	// previously parsed but not decoded, can be "post", "page", or other custom types
	return post.type;
}

export function wpdiscuz_post_rating_count(post) {
	// console.log(post);
	// console.warn(post.data);
	// console.error(post.data.wpdiscuz_post_rating_count);
	try {
		// console.log(post);
		return post.wpdiscuz_post_rating_count;
	} catch (error) {	
		console.error(post.data.title + ' had an error in wpdisduz_post_rating_count.js:' + error);
		// console.info(post);
		return '';
	}
}

export function wpdiscuz_post_rating(post) {
	try {
		// console.warn(post.data);
		// console.error(post.wpdiscuz_post_rating);
		// console.warn(post.data.title + ' has a rating of ' + post.wpdiscuz_post_rating + ' with ' + post.wpdiscuz_post_rating_count + ' ratings.');
		return post.wpdiscuz_post_rating;
	} catch (error) {
		console.error(post.data.title + ' had an error in wpdisduz_post_rating.js:' + error);
		// console.info(post);
		return '';
	}
}