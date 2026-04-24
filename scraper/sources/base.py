from abc import ABC, abstractmethod
from typing import List
from models import Seller


class BaseSource(ABC):
    """Base class for candidate seller discovery."""

    source_name: str = ""

    @abstractmethod
    def discover(self, max_results: int = 100) -> List[Seller]:
        """Discover potential seller candidates from this source."""
        pass
