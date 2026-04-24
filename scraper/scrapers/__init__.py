from .zalando import ZalandoScraper
from .laredoute import LaRedouteScraper
from .galeries_lafayette import GaleriesLafayetteScraper
from .john_lewis import JohnLewisScraper
from .debenhams import DebenhamsScraper
from .bloomingdales import BloomingdalesScraper
from .nordstrom import NordstromScraper

ALL_SCRAPERS = {
    "zalando": ZalandoScraper,
    "laredoute": LaRedouteScraper,
    "galeries_lafayette": GaleriesLafayetteScraper,
    "john_lewis": JohnLewisScraper,
    "debenhams": DebenhamsScraper,
    "bloomingdales": BloomingdalesScraper,
    "nordstrom": NordstromScraper,
}
