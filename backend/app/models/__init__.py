from app.models.user import User  # noqa: F401  — must be first (others FK to it)
from app.models.feedback import Feedback  # noqa: F401
from app.models.job import Job  # noqa: F401
from app.models.contact import Contact  # noqa: F401
from app.models.coffee_chat import CoffeeChat  # noqa: F401
from app.models.interview import Interview  # noqa: F401
from app.models.user_profile import UserProfile  # noqa: F401
from app.models.embedding import Embedding  # noqa: F401
