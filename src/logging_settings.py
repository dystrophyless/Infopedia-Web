import sys

logging_config = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "[{asctime}] #{levelname:8} {filename}:{lineno} - {message}",
            "style": "{",
        },
    },
    "handlers": {
        "default": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "stream": sys.stdout,
        },
    },
    "loggers": {
        "__main__": {"level": "DEBUG", "handlers": ["default"], "propagate": False},
        "src.database": {
            "level": "DEBUG",
            "handlers": ["default"],
            "propagate": False,
        },
        "src.prepare_app": {
            "level": "DEBUG",
            "handlers": ["default"],
            "propagate": False,
        },
        "src.users.repository": {
            "level": "DEBUG",
            "handlers": ["default"],
            "propagate": False,
        },
        "uvicorn": {
            "level": "INFO",
            "handlers": ["default"],
            "propagate": False,
        },
        "uvicorn.error": {
            "level": "INFO",
            "handlers": ["default"],
            "propagate": False,
        },
        "uvicorn.access": {
            "level": "INFO",
            "handlers": ["default"],
            "propagate": False,
        },
    },
    "root": {"level": "INFO", "handlers": ["default"]},
}
