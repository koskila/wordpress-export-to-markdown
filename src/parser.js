import chalk from 'chalk';
import fs from 'fs';
import * as luxon from 'luxon';
import * as data from './data.js';
import * as frontmatter from './frontmatter.js';
import * as shared from './shared.js';
import * as translator from './translator.js';

const shared = require('./shared');
const settings = require('./settings');
const translator = require('./translator');
const authors = require('./frontmatter/authors');

export async function parseFilePromise() {
	shared.logHeading('Parsing');
	const content = await fs.promises.readFile(shared.config.input, 'utf8');
	const rssData = await data.load(content);
	const allPostData = rssData.child('channel').children('item');

	const postTypes = getPostTypes(allPostData);
	const posts = collectPosts(allPostData, postTypes);

	const images = [];
	if (shared.config.saveImages === 'attached' || shared.config.saveImages === 'all') {
		images.push(...collectAttachedImages(allPostData));
	}
	if (shared.config.saveImages === 'scraped' || shared.config.saveImages === 'all') {
		images.push(...collectScrapedImages(allPostData, postTypes));
	}

	mergeImagesIntoPosts(images, posts);
	populateFrontmatter(posts);

	return posts;
}

function getPostTypes(allPostData) {
	// search export file for all post types minus some specific types we don't want
	const postTypes = [...new Set(allPostData // new Set() is used to dedupe array
		.map((postData) => postData.childValue('post_type'))
		.filter((postType) => ![
			'attachment',
			'revision',
			'nav_menu_item',
			'custom_css',
			'customize_changeset',
			'oembed_cache',
			'user_request',
			'wp_block',
			'wp_global_styles',
			'wp_navigation',
			'wp_template',
			'wp_template_part'
		].includes(postType))
	)];

	// change order to "post", "page", then all custom post types (alphabetically)
	prioritizePostType(postTypes, 'page');
	prioritizePostType(postTypes, 'post');

	return postTypes;
}

function getItemsOfType(allPostData, type) {
	return allPostData.filter((item) => item.childValue('post_type') === type);
}

function collectPosts(allPostData, postTypes) {
	let allPosts = [];
	postTypes.forEach((postType) => {
		const postsForType = getItemsOfType(allPostData, postType)
			//.filter((postData) => postData.childValue('status') !== 'trash')
			//.filter((postData) => !(postType === 'page' && postData.childValue('post_name') === 'sample-page'))
			.map((postData) => buildPost(postData));

			.filter(postData => postData.status[0] !== 'trash') // && postData.status[0] !== 'draft'
			.map(postData => ({
				// raw post data, used by frontmatter getters
				data: postData,

				// meta data isn't written to file, but is used to help with other things
				meta: {
					id: getPostId(postData),
					slug: getPostSlug(postData),
					coverImageId: getPostCoverImageId(postData),
					coverImage: undefined, // possibly set later in mergeImagesIntoPosts()
					type: postType,
					imageUrls: [] // possibly set later in mergeImagesIntoPosts()
				},

				// if the type of the post is either "post" or "page", we can get the rating
				// and rating count
				wpdiscuz_post_rating: postType === 'post' || postType === 'page' ? get_wpdiscuz_post_rating(postData) : '',
				wpdiscuz_post_rating_count: postType === 'post' || postType === 'page' ? get_wpdiscuz_post_rating_count(postData) : '',

				authors: postData.authors,

				// contents of the post in markdown
				content: translator.getPostContent(postData, turndownService, config)
			}));

		if (postsForType.length > 0) {
			if (postType === 'post') {
				console.log(`${postsForType.length} normal posts found.`);
			} else if (postType === 'page') {
				console.log(`${postsForType.length} pages found.`);
			} else {
				console.log(`${postsForType.length} custom "${postType}" posts found.`);
			}
		}

		allPosts.push(...postsForType);
	});

	return allPosts;
}

function get_wpdiscuz_post_rating(postData) {
	// if the post doesn't have a rating, log that and return an empty string
	// if (postData.wpdiscuz_post_rating === undefined) {
	// 	console.log(postData.post_name[0] + ' had no wpdisduz_post_rating.');
	// 	return '';
	// }

	// // if it does have a value, return it instead
	// try {
	// 	return postData.wpdiscuz_post_rating;
	// } catch (error) {
	// 	console.info(postData);
	// 	console.error(postData.post_name[0] + ' had an error in wpdisduz_post_rating:' + error);
	// 	return '';
	// }

	if (postData.postmeta === undefined) {
		return undefined;
	}

	const postmeta = postData.postmeta.find(postmeta => postmeta.meta_key[0] === 'wpdiscuz_post_rating');
	const id = postmeta ? postmeta.meta_value[0] : null;

	// console.log("Parsing rating: " + id);

	return id;
}

function get_wpdiscuz_post_rating_count(postData) {

	// console.log(postData.postmeta);

	if (postData.postmeta === undefined) {
		return undefined;
	}

	const postmeta = postData.postmeta.find(postmeta => postmeta.meta_key[0] === 'wpdiscuz_post_rating_count');
	const id = postmeta ? postmeta.meta_value[0] : null;

	// console.log("Parsing rating count: " + id);
	return id;

	// if (postData.wpdiscuz_post_rating_count === undefined) {
	// 	console.log(postData.post_name[0] + ' had no wpdisduz_post_rating_count.');
	// 	return '';
	// }

	// try {
	// 	return postData.wpdiscuz_post_rating_count;
	// } catch (error) {
	// 	// console.info(postData);
	// 	// console.error(postData.post_name[0] + ' had an error in wpdisduz_post_rating_count:' + error);
	// 	return '';
	// }
}

function getPostId(postData) {
	return postData.post_id[0];
}

function getPostSlug(postData) {
	if (!postData.post_name[0]) {
		return postData.post_id[0];
	}
	return decodeURIComponent(postData.post_name[0]);
}

function getPostMetaValue(data, key) {
	const metas = data.children('postmeta');
	const meta = metas.find((meta) => meta.childValue('meta_key') === key);
	return meta ? meta.childValue('meta_value') : undefined;
}

function collectAttachedImages(allPostData) {
	const images = getItemsOfType(allPostData, 'attachment')
		// filter to certain image file types
		.filter((attachment) => {
			const url = attachment.childValue('attachment_url');
			return url && (/\.(gif|jpe?g|png|webp)$/i).test(url);
		})
		.map((attachment) => ({
			id: attachment.childValue('post_id'),
			postId: attachment.optionalChildValue('post_parent') ?? 'nope', // may not exist (cover image in a squarespace export, for example)
			url: attachment.childValue('attachment_url')
		}));

	console.log(images.length + ' attached images found.');
	return images;
}

function collectScrapedImages(allPostData, postTypes) {
	const images = [];
	postTypes.forEach((postType) => {
		getItemsOfType(allPostData, postType).forEach((postData) => {
			const postId = postData.childValue('post_id');
			
			const postContent = postData.childValue('encoded');
			const scrapedUrls = [...postContent.matchAll(/<img(?=\s)[^>]+?(?<=\s)src="(.+?)"[^>]*>/gi)].map((match) => match[1]);
			scrapedUrls.forEach((scrapedUrl) => {
				let url;
				if (isAbsoluteUrl(scrapedUrl)) {
					url = scrapedUrl;
				} else {
					const postLink = postData.childValue('link');
					if (isAbsoluteUrl(postLink)) {
						url = new URL(scrapedUrl, postLink).href;
					} else {
						throw new Error(`Unable to determine absolute URL from scraped image URL '${scrapedUrl}' and post link URL '${postLink}'.`);
					}
				}

				images.push({
					id: 'nope', // scraped images don't have an id
					postId,
					url
				});
			});
		});
	});

	console.log(images.length + ' images scraped from post body content.');
	return images;
}

function mergeImagesIntoPosts(images, posts) {
	images.forEach((image) => {
		posts.forEach((post) => {
			let shouldAttach = false;

			// this image was uploaded as an attachment to this post
			if (image.postId === post.id) {
				shouldAttach = true;
			}

			// this image was set as the featured image for this post
			if (image.id === post.coverImageId) {
				shouldAttach = true;
				post.coverImage = shared.getFilenameFromUrl(image.url);
			}

			if (shouldAttach && !post.imageUrls.includes(image.url)) {
				post.imageUrls.push(image.url);
			}
		});
	});
}

function populateFrontmatter(posts) {
	posts.forEach(post => {
		const frontmatter = {};

		// console.log("Post frontmatter fields: ");
		// console.log({post});

		settings.frontmatter_fields.forEach(field => {
			const [key, alias] = field.split(':');

			let frontmatterGetter = frontmatter[key];

			if (!frontmatterGetter) {
				throw `Could not find a frontmatter getter named "${key}".`;
			}
			
			// frontmatter[alias || key] = value;
			
			post.frontmatter[alias ?? key] = frontmatterGetter(post);
			var value = frontmatterGetter(post);

			if (post.data.title.indexOf("stuck") > -1) {
				console.log("Frontmattergetting with alias " + alias + ", key: " + key + " and value: " + value);
			}
		});
	});
}

function prioritizePostType(postTypes, postType) {
	const index = postTypes.indexOf(postType);
	if (index !== -1) {
		postTypes.splice(index, 1);
		postTypes.unshift(postType);
	}
}

function isAbsoluteUrl(url) {
	return (/^https?:\/\//i).test(url);
}
