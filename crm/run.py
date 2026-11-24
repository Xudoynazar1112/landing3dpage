import os
import sys
import asyncio
import logging
from pathlib import Path
import uvicorn

# Loyiha papkasini sys.path ga qo'shish
crm_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(crm_dir))

from config import HOST, PORT, TELEGRAM_BOT_TOKEN
from crm_api import app
from init_db import init_database_data
from bot import dp, bot, BOT_TOKEN, daily_calendar_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("crm_system")


async def run_fastapi_server(host: str, port: int):
    """FastAPI uvicorn serverini ishga tushirish"""
    config = uvicorn.Config(
        app=app,
        host=host,
        port=port,
        log_level="info",
        loop="asyncio"
    )
    server = uvicorn.Server(config)
    await server.serve()


async def run_telegram_bot():
    """Telegram Botni polling rejimida ishga tushirish"""
    if not BOT_TOKEN or not bot or not dp:
        logger.warning(
            "⚠️ TELEGRAM_BOT_TOKEN kiritilmagan. Bot faolsizlantirildi.\n"
            "   CRM Web App va REST API to'liq ishlamoqda.\n"
            "   Botni yoqish uchun 'crm/.env' faylidagi TELEGRAM_BOT_TOKEN parametrini to'ldiring."
        )
        return

    logger.info("🤖 Telegram Bot muvaffaqiyatli ishga tushirilmoqda...")
    try:
        # Eski kutilmagan webhooklarni o'chirish
        await bot.delete_webhook(drop_pending_updates=True)
        # Kunlik kalendar xabarnomalari schedulerini fonda ishga tushirish
        asyncio.create_task(daily_calendar_scheduler(bot))
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"Telegram bot ishga tushishida xatolik: {e}")
    finally:
        await bot.session.close()


async def main():
    # 1. Baza va dastlabki ma'lumotlarni tekshirish / yaratish
    init_database_data()

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    print("\n" + "=" * 60)
    print("🚀 DR. ZOKHIDJON CRM TIZIMI ISHGA TUSHMOQDA!")
    print(f"🌐 Web Admin Panel:        http://localhost:{port}/")
    print(f"📖 Swagger API Hujjatlari:  http://localhost:{port}/docs")
    if BOT_TOKEN:
        print(f"🤖 Telegram Bot:             Faol (@BotFather orqali sozlangan)")
    else:
        print(f"🤖 Telegram Bot:             O'chirilgan (Token kiritilmagan)")
    print("=" * 60 + "\n")

    # 2. FastAPI va Botni parallel ishga tushirish
    await asyncio.gather(
        run_fastapi_server(host, port),
        run_telegram_bot()
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("CRM tizimi to'xtatildi.")
