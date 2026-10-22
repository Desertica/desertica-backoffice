/** Both languages in one file per feature; the `en` object must have exactly the keys of `es`. */
export function defineMessages<const K extends string>(messages: {
  es: Record<K, string>;
  en: Record<NoInfer<K>, string>;
}) {
  return messages;
}
