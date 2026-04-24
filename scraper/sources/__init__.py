from .web_search import WebSearchSource
from .amazon_fr import AmazonFRSource
from .dtc_brands import DTCBrandsSource

ALL_SOURCES = {
    "web_search": WebSearchSource,
    "amazon_fr": AmazonFRSource,
    "dtc_brands": DTCBrandsSource,
}
