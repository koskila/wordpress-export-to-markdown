
Guide: 
https://github.com/lonekorean/wordpress-export-to-markdown

Tools > Export > Download Export file
(https://www.koskila.net/wp-admin/export.php)



npm install && node index.js

node app.js --input="../koskilanet-migration/sharepointproblems.WordPress.2025-04-22.xml" --output="../koskilanet-migration/output" --post-folders=false --prefix-date=false --date-folders=none --save-images=all --request-delay=150 --write-delay=0 --timezone="Europe/Helsinki" --include-time=true --strict-ssl=false 

node app.js --input="../koskilanet-migration/sharepointproblems.WordPress.2025-04-22.xml" --output="../koskilanet-migration/output" --post-folders=false --prefix-date=false --date-folders=none --save-images=all --request-delay=150 --write-delay=0 --timezone="Europe/Helsinki" --include-time=true --strict-ssl=false --frontmatter-fields='title','date:published_date','modified_date','status:status','pinned:isFeatured','categories','authors','tags','coverImage','wpdiscuz_post_rating','wpdiscuz_post_rating_count','comments:commentArray'

windows:
robocopy D:\github\koskilanet-migration\output\post D:\github\koskilanet-blazorstatic\web\Content\Blog\

macos:
rsync -av --progress ~/repos/koskilanet-migration/output/posts/ ~/repos/koskilanet-blazorstatic/web/Content/Blog/