
Guide: 
https://github.com/lonekorean/wordpress-export-to-markdown

Tools > Export > Download Export file
(https://www.koskila.net/wp-admin/export.php)



npm install && node index.js

node index.js --input="D:\github\koskilanet-migration\sharepointproblems.WordPress.2025-03-03.xml" --output="D:\github\koskilanet-migration\output" --post-folders=false --prefix-date=false --year-folders=false --month-folders=false --save-attached-images=true --save-scraped-images=true --include-other-types=true

robocopy D:\github\koskilanet-migration\output\post D:\github\koskilanet-blazorstatic\web\Content\Blog\