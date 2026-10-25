"""M1 演示用最小俄语词表（D2-C 裁定 2026-10-26）——人工翻译直插本地 entity_names。

与 I3 包语料的关系：包行以相同自然键 update_or_create 灌入后即覆盖/共存，
本命令写入的行可随时 --purge 置 retired（不物理删，保留痕迹）。
词表覆盖 M1 演示常见品类（25号受控品类为主的中文类目名→俄语）；
品牌名 en 回退已是拉丁转写，暂不收词。
"""

from django.core.management.base import BaseCommand

from catalog.models_category import Category
from catalog.models_entity_names import EntityName

# zh 类目名 → 俄语（M1 演示最小集；正式语料走 I3 包，28号§九②）
DEMO_WORDS: dict[str, str] = {
    "滤清器": "Фильтры",
    "机油滤清器": "Масляные фильтры",
    "空气滤清器": "Воздушные фильтры",
    "火花塞": "Свечи зажигания",
    "刹车盘片": "Тормозные диски и колодки",
    "刹车片": "Тормозные колодки",
    "刹车盘": "Тормозные диски",
    "轮毂": "Диски колёсные",
    "汽车玻璃": "Автомобильные стёкла",
    "润滑油": "Моторные масла",
    "水泵": "Водяные насосы",
    "发电机": "Генераторы",
    "起动机": "Стартеры",
    "减震器": "Амортизаторы",
    "正时皮带": "Ремни ГРМ",
}


class Command(BaseCommand):
    help = "灌入 M1 演示用俄语类目词表（人工翻译，正式语料以 I3 包为准）"

    def add_arguments(self, parser):
        parser.add_argument("--purge", action="store_true", help="将本命令写入的行置 retired")

    def handle(self, *args, **options):
        if options["purge"]:
            n = EntityName.objects.filter(source="demo_manual").update(status="retired")
            self.stdout.write(self.style.SUCCESS(f"已置 retired {n} 行演示词表"))
            return

        created = hit = 0
        for zh, ru in DEMO_WORDS.items():
            for cat in Category.objects.filter(category_name=zh, category_status="active"):
                _, was_created = EntityName.objects.get_or_create(
                    entity_type="category",
                    entity_id=str(cat.category_id),
                    market="ru",
                    locale="ru-RU",
                    name_type="official",
                    name=ru,
                    defaults={"source": "demo_manual", "status": "active"},
                )
                created += int(was_created)
                hit += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"✅ 演示词表：命中类目 {hit} 个，新建 {created} 行（其余已在库）"
                f"——正式语料到位后以 I3 包覆盖"
            )
        )
