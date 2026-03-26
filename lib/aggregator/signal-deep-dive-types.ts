export type SignalDeepDiveSection = {
  heading: string;
  body: string;
};

export type SignalDeepDiveArticle = {
  title: string;
  dek: string;
  sections: SignalDeepDiveSection[];
  sourcesNote: string;
};
