#!/bin/bash
# `prisma migrate dev` tạo một shadow database tạm (tên prisma_migrate_shadow_db_*) để so sánh migration.
# User thường chỉ có quyền trên MYSQL_DATABASE nên cần cấp thêm quyền cho các database tên này.
# Script chỉ chạy lần đầu khi volume mysql_data còn trống.
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" <<SQL
GRANT ALL PRIVILEGES ON \`prisma\_migrate\_shadow\_db\_%\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SQL
