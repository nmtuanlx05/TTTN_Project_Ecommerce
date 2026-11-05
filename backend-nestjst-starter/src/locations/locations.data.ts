import rawUnits from './data/vn-admin-units.json';

// Dữ liệu hành chính theo chuẩn CŨ (3 cấp), xem data/NOTICE.md. Nạp vào bộ nhớ một lần khi import module,
// không gọi mạng lúc chạy. Đổi sang chuẩn mới (bỏ cấp huyện) chỉ cần thay file JSON và sửa file này.

export interface LocationItem {
  code: string;
  name: string;
}

type RawWard = LocationItem;
interface RawDistrict extends LocationItem {
  wards: RawWard[];
}
interface RawProvince extends LocationItem {
  districts: RawDistrict[];
}

export interface WardRecord extends LocationItem {
  districtCode: string;
  provinceCode: string;
}
export interface DistrictRecord extends LocationItem {
  provinceCode: string;
  // Đã sắp xếp theo tên tiếng Việt
  wards: WardRecord[];
}
export interface ProvinceRecord extends LocationItem {
  // Đã sắp xếp theo tên tiếng Việt
  districts: DistrictRecord[];
}

// "Quận 2" đứng trước "Quận 10" nhờ numeric; có dấu theo locale tiếng Việt
const collator = new Intl.Collator('vi', { numeric: true });
const byName = (a: LocationItem, b: LocationItem) =>
  collator.compare(a.name, b.name);

export interface LocationIndex {
  provinces: ProvinceRecord[];
  provinceByCode: Map<string, ProvinceRecord>;
  districtByCode: Map<string, DistrictRecord>;
  wardByCode: Map<string, WardRecord>;
}

export function buildLocationIndex(units: RawProvince[]): LocationIndex {
  const provinceByCode = new Map<string, ProvinceRecord>();
  const districtByCode = new Map<string, DistrictRecord>();
  const wardByCode = new Map<string, WardRecord>();

  for (const p of units) {
    const districts = p.districts.map((d) => {
      const wards = d.wards
        .map((w) => ({
          code: w.code,
          name: w.name,
          districtCode: d.code,
          provinceCode: p.code,
        }))
        .sort(byName);
      wards.forEach((w) => wardByCode.set(w.code, w));
      const record: DistrictRecord = {
        code: d.code,
        name: d.name,
        provinceCode: p.code,
        wards,
      };
      districtByCode.set(d.code, record);
      return record;
    });
    provinceByCode.set(p.code, {
      code: p.code,
      name: p.name,
      districts: districts.sort(byName),
    });
  }

  return {
    provinces: [...provinceByCode.values()].sort(byName),
    provinceByCode,
    districtByCode,
    wardByCode,
  };
}

export const LOCATION_INDEX: LocationIndex = buildLocationIndex(rawUnits);
