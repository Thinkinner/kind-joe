type OptimizeCloudinaryUrlOptions = {
  width?: number;
  transforms?: string[];
};

const CLOUDINARY_UPLOAD_SEGMENT = "/upload/";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const splitOffSuffix = (value: string): { path: string; suffix: string } => {
  const queryIdx = value.indexOf("?");
  const hashIdx = value.indexOf("#");

  if (queryIdx === -1 && hashIdx === -1) return { path: value, suffix: "" };
  if (queryIdx === -1) return { path: value.slice(0, hashIdx), suffix: value.slice(hashIdx) };
  if (hashIdx === -1) return { path: value.slice(0, queryIdx), suffix: value.slice(queryIdx) };

  const cut = Math.min(queryIdx, hashIdx);
  return { path: value.slice(0, cut), suffix: value.slice(cut) };
};

const hasDirective = (pathAfterUpload: string, directive: string): boolean => {
  const pattern = new RegExp(`(^|[,/])${escapeRegExp(directive)}([,/]|$)`);
  return pattern.test(pathAfterUpload);
};

const sanitizeTransforms = (transforms: string[]): string[] =>
  transforms
    .flatMap((chunk) => chunk.split(","))
    .map((token) => token.trim())
    .filter(Boolean);

export function optimizeCloudinaryUrl(
  rawUrl: string,
  options: OptimizeCloudinaryUrlOptions = {},
): string {
  const url = (rawUrl || "").trim();
  if (!url || !url.includes(CLOUDINARY_UPLOAD_SEGMENT)) return rawUrl;

  const [prefix, afterUpload = ""] = url.split(CLOUDINARY_UPLOAD_SEGMENT);
  if (!prefix) return rawUrl;

  const { path: pathAfterUpload, suffix } = splitOffSuffix(afterUpload);
  const width = options.width ?? 0;

  const requested = [
    "f_auto",
    "q_auto",
    ...(Number.isFinite(width) && width > 0
      ? ["c_limit", `w_${Math.round(width)}`, "dpr_auto"]
      : []),
    ...sanitizeTransforms(options.transforms ?? []),
  ];

  const directives = requested.filter(
    (directive, idx, all) =>
      all.indexOf(directive) === idx && !hasDirective(pathAfterUpload, directive),
  );

  if (!directives.length) return rawUrl;

  return `${prefix}${CLOUDINARY_UPLOAD_SEGMENT}${directives.join(",")}/${pathAfterUpload}${suffix}`;
}
