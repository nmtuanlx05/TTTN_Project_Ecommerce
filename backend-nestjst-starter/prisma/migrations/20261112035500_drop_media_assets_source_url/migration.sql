-- DropColumn: cột media_assets.sourceUrl chỉ phục vụ script chuyển ảnh cũ trên đĩa (đã gỡ); kiểm tra trước khi áp: 0 dòng có giá trị.
ALTER TABLE `media_assets` DROP COLUMN `sourceUrl`;
