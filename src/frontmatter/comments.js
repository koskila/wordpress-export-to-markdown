module.exports = async (post) => {
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
};
