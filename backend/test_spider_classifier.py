from app.classifiers.spider_classifier import SpiderClassifier

classifier = SpiderClassifier()

samples = [
    "DX de HB9ON: VK9AA 14025 CW UP2",
    "WWV de W0MU",
    "WCY de DK0WCY",
    "Welcome to HB9ON-8 Dxspider Cluster",
    "login: Hello HB9ISO",
    "Capabilities: ve7cc rbn",
    "-",
]

for sample in samples:
    message_type = classifier.classify(sample)

    print(f"{message_type.name:10} | {sample}")

