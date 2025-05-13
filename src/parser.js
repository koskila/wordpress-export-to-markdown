import chalk from 'chalk';
import fs from 'fs';
import * as luxon from 'luxon';
import * as data from './data.js';
import * as frontmatter from './frontmatter.js';
import * as shared from './shared.js';
import * as translator from './translator.js';
import * as settings from './settings.cjs';

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
			'taxopress_logs',
			'es_template',
			'flamingo_contact',
			'flamingo_inbound',
			'wpcf7_contact_form',
			'wpdiscuz_form',
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
			.filter((postData) => postData.childValue('status') !== 'trash')
			.filter((postData) => !(postType === 'page' && postData.childValue('post_name') === 'sample-page'))
			.map((postData) => buildPost(postData));

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

function buildPost(data) {

	return {

		// full raw post data
		data,

		// body content converted to markdown
		content: translator.getPostContent(
			data.childValue('encoded') || '', 
			data.childValue('post_id') || ''
		),

		// particularly useful values for all sorts of things
		type: data.childValue('post_type') || 'post',
		id: data.childValue('post_id') || '',
		status: data.childValue('status') || '',
		slug: data.childValue('post_name') ? decodeURIComponent(data.childValue('post_name')) : '',
		date: getPostDate(data),
		modified_date: getPostModifiedDate(data),
		coverImageId: getPostMetaValue(data, '_thumbnail_id') || '',

		// these are possibly set later in mergeImagesIntoPosts()
		coverImage: undefined,
		imageUrls: [],


		authors: data.authors,

		wpdiscuz_post_rating: getPostMetaValue(data, 'wpdiscuz_post_rating') || '',
		wpdiscuz_post_rating_count: getPostMetaValue(data, 'wpdiscuz_post_rating_count') || '0',
		
		isFeatured: (() => {
			const sticky = data.childValue('is_sticky');
			if (sticky !== 0 && sticky !== '0' && sticky !== null && sticky !== undefined) {
				//throw `Invalid value for is_sticky: ${sticky} for ${data.childValue('post_name') }`;
				return "true";
			}
			else {
				return "false";
			}
		})(),
		
		comments: getComments(data),
	};
}

function getPostDate(data) {
	const date = luxon.DateTime.fromRFC2822(data.childValue('pubDate'), { zone: shared.config.timezone });
	return date.isValid ? date : undefined;
}

function getPostModifiedDate(data) {
    const dateString = data.childValue('post_modified');
    const date = luxon.DateTime.fromFormat(dateString, 'yyyy-MM-dd HH:mm:ss', { zone: shared.config.timezone });
    // console.log(`Modified date: ${dateString} and ${date}`);
    return date.isValid ? date : undefined;
}

function getPostId(postData) {
	console.log(postData);
	return postData.post_id[0];
}

function getPostSlug(postData) {
	if (!postData.post_name[0]) {
		return postData.post_id[0];
	}
	return decodeURIComponent(postData.post_name[0]);
}

function getComments(data) {
	return data.comments;
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

	posts.forEach((post) => {
		post.frontmatter = {};
		shared.config.frontmatterFields.forEach((field) => {
			const [key, alias] = field.split(':');

			let frontmatterGetter = frontmatter[key];
			if (!frontmatterGetter) {
				throw `Could not find a frontmatter getter named "${key}".`;
			}

			let value = frontmatterGetter(post);

			// Recursively process any object or value for proper YAML serialization
			if (value !== undefined && value !== null) {
				const processForYaml = (val) => {
					// Handle basic types
					if (val === null || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
						return val;
					}
					
					// Handle Luxon DateTime objects
					if (val && typeof val === 'object' && val.isValid !== undefined && typeof val.toISO === 'function') {
						return val.toISO();
					}
					
					// Handle arrays
					if (Array.isArray(val)) {
						return val.map(item => processForYaml(item));
					}
					
					// Handle objects
					if (typeof val === 'object') {
						const result = {};
						// console.log("Processing object:" + JSON.stringify(val));

						// return {

						for (const [k, v] of Object.entries(val)) {
							result[k] = processForYaml(v);
						}
						return result;
					}
					
					return val;
				};
				
				value = processForYaml(value);
			}
			

            post.frontmatter[alias ?? key] = value;
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
