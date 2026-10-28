// Shim thao tác trực tiếp metadata nội bộ (kiểu any) nên tắt các rule unsafe-* cho file này.
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
// Thay thế @nestjs/mapped-types CHỈ trong e2e (qua moduleNameMapper trong jest-e2e.json).
// Bản thật chỉ có ESM và dùng import.meta nên Jest (CommonJS) không nạp được.
// Shim này sao chép đúng phần metadata mà PickType/PartialType thật làm: validation của class-validator
// và transform của class-transformer, rồi gắn IsOptional cho PartialType (bỏ qua cả undefined lẫn null).
import { getMetadataStorage, IsOptional } from 'class-validator';
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';

type Ctor<T = any> = new (...args: any[]) => T;

function inherit(parent: Ctor, target: Ctor, keys?: readonly string[]) {
  const picked = (key: string) => !keys || keys.includes(key);

  const validation = getMetadataStorage();
  const inheritedKeys = validation
    .getTargetValidationMetadatas(parent, null as any, false, false)
    .filter(({ propertyName }) => picked(propertyName))
    .map((metadata) => {
      validation.addValidationMetadata({ ...metadata, target });
      return metadata.propertyName;
    });

  // class-transformer lưu metadata theo class trong các Map nội bộ
  const storage = defaultMetadataStorage as unknown as Record<
    string,
    Map<Ctor, Map<string, unknown>>
  >;
  for (const key of [
    '_excludeMetadatas',
    '_exposeMetadatas',
    '_transformMetadatas',
    '_typeMetadatas',
  ]) {
    const map = storage[key];
    for (
      let cls: any = parent;
      cls && cls !== Object;
      cls = Object.getPrototypeOf(cls)
    ) {
      const own = map.get(cls);
      if (!own) continue;
      const copied = new Map<string, unknown>();
      for (const [prop, value] of own.entries()) {
        if (!picked(prop)) continue;
        copied.set(
          prop,
          Array.isArray(value)
            ? value.map((item) => ({ ...item, target }))
            : { ...(value as object), target },
        );
      }
      const existing = map.get(target);
      map.set(target, existing ? new Map([...existing, ...copied]) : copied);
    }
  }
  return inheritedKeys;
}

export function PickType<T>(classRef: Ctor<T>, keys: readonly (keyof T)[]) {
  class PickClassType {}
  inherit(classRef, PickClassType, keys as readonly string[]);
  return PickClassType as Ctor<Pick<T, (typeof keys)[number]>>;
}

export function PartialType<T>(classRef: Ctor<T>) {
  class PartialClassType {}
  const keys = inherit(classRef, PartialClassType);
  keys.forEach((key) => IsOptional()(PartialClassType.prototype, key));
  return PartialClassType as Ctor<Partial<T>>;
}
