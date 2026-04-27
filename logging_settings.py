import sys

logging_config = {
    "version": 1,
    "disable_existing_loggers": True,
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
        "connection": {
            "level": "DEBUG",
            "handlers": ["default"],
            "propagate": False,
        },
        "create_tables": {
            "level": "DEBUG",
            "handlers": ["default"],
            "propagate": False,
        },
        "prepare_app": {
            "level": "DEBUG",
            "handlers": ["default"],
            "propagate": False,
        },
    },
    "root": {"formatter": "default", "handlers": ["default"]},
}
