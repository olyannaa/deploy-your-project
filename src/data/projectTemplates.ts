export interface ProjectSection {
  id: string;
  sectionCode: string;
  designation: string;
  sectionName: string;
  startDate: string;
  plannedEndDate: string;
  executor: string;
  actualEndDate: string;
  notes: string;
  parentId?: string; // For subsections
  level?: number; // 0 = main section, 1 = subsection
  executorId?: string | null;
  executorName?: string | null;
  isNew?: boolean;
}

// Template 1: Сбор исходно-разрешительных данных (ИРД)
export const irdTemplate: Omit<ProjectSection, 'id'>[] = [
  { sectionCode: "1", designation: "", sectionName: "Топосъемка части земельного участка, предназначенного для проектирования Объекта 1:500", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "Предоставляется в течение 10 дней со дня заключения Договора", level: 0 },
  { sectionCode: "2", designation: "", sectionName: "Данные по розе ветров применительно к указанной части земельного участка", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "3", designation: "", sectionName: "Кадастровый квартал, в котором предполагается формирование земельного участка, предназначенного для проектирования", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "4", designation: "", sectionName: "Утвержденное заказчиком техническое задание на разработку проектной документации", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "Предоставляется в течение 30 дней со дня формирования земельного участка", level: 0 },
  { sectionCode: "5", designation: "", sectionName: "Градостроительный план земельного участка", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "6", designation: "", sectionName: "Технические условия на электроснабжение", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "7", designation: "", sectionName: "Технические условия на водоснабжение и канализацию", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "8", designation: "", sectionName: "Технические условия органа, уполномоченного на ведение дорожного хозяйства на примыкание к автодороге общего пользования", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "9", designation: "", sectionName: "Экспертное заключение центра гигиены и эпидемиологии по субъекту на проект СЗЗ", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "10", designation: "", sectionName: "Санитарно-эпидемиологическое заключение на участок строительства", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "11", designation: "", sectionName: "Справка территориального органа Росгидромета о фоновых загрязнениях в атмосфере", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "12", designation: "", sectionName: "Справка центра гидрометеорологии и мониторингу окружающей среды о климатических характеристиках", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "13", designation: "", sectionName: "Справка об отсутствии на земельном участке водных объектов", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "14", designation: "", sectionName: "Справка о наличии организованных источников питьевого водоснабжения и зон санитарной охраны", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "15", designation: "", sectionName: "Гидрогеологическое заключение на водозаборные скважины с расчетом 2, 3 поясов санитарной охраны", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "16", designation: "", sectionName: "Хим анализ воды из скважин", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "17", designation: "", sectionName: "Заключение историко-культурной экспертизы на участок строительства", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "18", designation: "", sectionName: "Справка из территориального органа МЧС России о зоне обслуживания пожарного депо", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "19", designation: "", sectionName: "Условия МЧС на разработку раздела ГОЧС", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "20", designation: "", sectionName: "Справка о расстоянии от объекта до лесного массива и о типе леса", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "21", designation: "", sectionName: "Справка о зооветеринарных расстояниях до существующих объектов содержания скота", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "22", designation: "", sectionName: "Справка Заказчика о вывозе навоза, правоустанавливающие документы на земельный участок", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "23", designation: "", sectionName: "Справка сотового оператора о зоне покрытия проектируемого объекта", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "24", designation: "", sectionName: "Справка об отсутствии на земельном участке под строительство горных выработок", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "25", designation: "", sectionName: "Справка уполномоченного органа об отсутствии скотомогильников биотермических ям", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "26", designation: "", sectionName: "Справка уполномоченного органа об отсутствии особо охраняемых природных территорий", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "27", designation: "", sectionName: "Справка уполномоченного органа об отсутствии объектов культурного наследия", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "28", designation: "", sectionName: "Письмо от уполномоченного органа о возможности содержании КРС в неотапливаемых зданиях", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "29", designation: "", sectionName: "Заключение уполномоченного органа недропользования об отсутствии полезных ископаемых", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "30", designation: "", sectionName: "Договор на вывоз и утилизацию твердых бытовых отходов", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "31", designation: "", sectionName: "Договор на вывоз утилизацию жидких бытовых отходов", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "32", designation: "", sectionName: "Справка о складировании и дальнейшем использовании плодородного грунта", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "33", designation: "", sectionName: "Письмо-согласование органов соц защиты о непривлечении маломобильных групп населения", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "34", designation: "", sectionName: "Проект санитарно-защитной зоны", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "35", designation: "", sectionName: "Результаты инженерно-геодезических изысканий", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "36", designation: "", sectionName: "Результаты инженерно-геологических изысканий", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "37", designation: "", sectionName: "Результаты инженерно-экологических изысканий", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "38", designation: "", sectionName: "Результаты инженерно-гидрометеорологических изысканий", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "39", designation: "", sectionName: "Обследование здания производственного корпуса", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "40", designation: "", sectionName: "Выписка из ЕГРН на земельный участок, предназначенный для проектирования", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
];

// Template 2: Проектная документация (с подразделами)
export const projectDocumentationTemplate: Omit<ProjectSection, 'id'>[] = [
  { sectionCode: "1", designation: "ПЗ", sectionName: "Раздел 1. «Пояснительная записка»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "2", designation: "ПЗУ", sectionName: "Раздел 2. «Схема планировочной организации земельного участка»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "3", designation: "АР", sectionName: "Раздел 3. «Объемно-планировочные и архитектурные решения»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "4", designation: "КР", sectionName: "Раздел 4. «Конструктивные решения»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "5", designation: "ИОС", sectionName: "Раздел 5. «Сведения об инженерном оборудовании, о сетях и системах инженерно-технического обеспечения»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "5.1", designation: "ИОС1", sectionName: "Подраздел 1. «Система электроснабжения»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 1 },
  { sectionCode: "5.2", designation: "ИОС2", sectionName: "Подраздел 2. «Система водоснабжения»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 1 },
  { sectionCode: "5.3", designation: "ИОС3", sectionName: "Подраздел 3. «Система водоотведения»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 1 },
  { sectionCode: "5.4", designation: "ИОС4", sectionName: "Подраздел 4. «Отопление, вентиляция и кондиционирование воздуха, тепловые сети»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 1 },
  { sectionCode: "5.5", designation: "ИОС5", sectionName: "Подраздел 5. «Сети связи»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 1 },
  { sectionCode: "5.6", designation: "ИОС6", sectionName: "Подраздел 6. «Система газоснабжения»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 1 },
  { sectionCode: "6", designation: "ТХ", sectionName: "Раздел 6. «Технологические решения»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "7", designation: "ПОС", sectionName: "Раздел 7. «Проект организации строительства»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "8", designation: "ООС", sectionName: "Раздел 8. «Мероприятия по охране окружающей среды»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "9", designation: "ПБ", sectionName: "Раздел 9. «Мероприятия по обеспечению пожарной безопасности»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "10", designation: "ТБЭ", sectionName: "Раздел 10. «Требования к обеспечению безопасной эксплуатации объектов капитального строительства»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "11", designation: "-", sectionName: "Раздел 11. «Мероприятия по обеспечению доступа инвалидов к объекту капитального строительства»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "12", designation: "СМ", sectionName: "Раздел 12. «Смета на строительство, реконструкцию, капитальный ремонт, снос объекта капитального строительства»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "13", designation: "ГОЧС", sectionName: "Раздел 13. «Иная документация в случаях, предусмотренных законодательными и иными нормативными правовыми актами РФ»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "13.1", designation: "ГОЧС", sectionName: "Подраздел 13.1. «Перечень мероприятий по гражданской обороне, мероприятий по предупреждению чрезвычайных ситуаций природного и техногенного характера»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 1 },
];

// Template 3: Рабочая документация
export const workDocumentationTemplate: Omit<ProjectSection, 'id'>[] = [
  { sectionCode: "1", designation: "ГП", sectionName: "Раздел «Генплан и транспорт»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "2", designation: "КЖ0, КЖ", sectionName: "Раздел «Конструкции железобетонные»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "3", designation: "КМ", sectionName: "Раздел «Конструкции металлические»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "4", designation: "АР", sectionName: "Раздел «Архитектурные решения»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "5", designation: "ЭС", sectionName: "Раздел «Наружная система электроснабжения, электроосвещения»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "6", designation: "ЭО", sectionName: "Раздел «Внутренняя система электроснабжения, электроосвещения»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "7", designation: "НВК", sectionName: "Раздел «Наружные сети водоснабжения и канализации»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "8", designation: "ВК", sectionName: "Раздел «Внутренние сети водоснабжения и канализации»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "9", designation: "ТХ", sectionName: "Раздел «Технологические решения»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "10", designation: "ОВиК", sectionName: "Раздел «Отопление, вентиляция и кондиционирование»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "11", designation: "АОВиК", sectionName: "Раздел «Автоматизация отопления вентиляции и кондиционирования»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "12", designation: "АВиВ", sectionName: "Раздел «Автоматизация внутренних сетей водоснабжения и водоотведения»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
];

// Template 4: Мастер План
export const masterPlanTemplate: Omit<ProjectSection, 'id'>[] = [
  { sectionCode: "0", designation: "МП", sectionName: "Разработка Пояснительной записки", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "1", designation: "Графическая часть", sectionName: "Разработка Мастер плана", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "1.1", designation: "", sectionName: "Создание вариантов технологических схем", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 1 },
  { sectionCode: "1.2", designation: "", sectionName: "Проработка конкретной площадки", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 1 },
  { sectionCode: "1.3", designation: "", sectionName: "Расчет нагрузок", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 1 },
  { sectionCode: "3", designation: "ССР", sectionName: "Расчет ориентировочной стоимости объекта", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "4", designation: "ИГДИ", sectionName: "Инженерно-геодезические изыскания", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
];

// Template 5: Договор
export const contractTemplate: Omit<ProjectSection, 'id'>[] = [
  { sectionCode: "1", designation: "", sectionName: "Выдача коммерческого предложения", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "2", designation: "", sectionName: "Подписание и отправка договора Заказчику", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "3", designation: "", sectionName: "Выставление счета на аванс", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "4", designation: "", sectionName: "Отслеживание актуальности работ и сроков промежуточных платежей", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "5", designation: "", sectionName: "Выставление счета/ов на промежуточный платеж (при необходимости)", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "6", designation: "", sectionName: "Подготовка электронного и печатного комплектов документации согласно договору", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "7", designation: "", sectionName: "Подготовка Актов для распечатанного комплекта документации", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "8", designation: "", sectionName: "Выставление Актов выполненных работ", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "9", designation: "", sectionName: "Выставление счета на остаток", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "10", designation: "", sectionName: "Контроль окончательной оплаты по договору", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "11", designation: "", sectionName: "Выставление претензии Заказчику при отсутствии оплаты по договору", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
];

// Template 6: Блок 6 (линейные объекты)
export const block6LinearTemplate: Omit<ProjectSection, 'id'>[] = [
  { sectionCode: "1", designation: "ПЗ", sectionName: "Раздел 1. «Пояснительная записка»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "2", designation: "", sectionName: "Раздел 2. «Проект полосы отвода»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "3", designation: "", sectionName: "Раздел 3. «Технологические и конструктивные решения линейного объекта. Искусственные сооружения»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "4", designation: "", sectionName: "Раздел 4. «Здания, строения и сооружения, входящие в инфраструктуру линейного объекта»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "5", designation: "ПОС", sectionName: "Раздел 5. «Проект организации строительства»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "6", designation: "ООС", sectionName: "Раздел 6. «Мероприятия по охране окружающей среды»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "7", designation: "ПБ", sectionName: "Раздел 7. «Мероприятия по обеспечению пожарной безопасности»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "8", designation: "", sectionName: "Раздел 8. «Требования к обеспечению безопасной эксплуатации линейного объекта»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "9", designation: "", sectionName: "Раздел 9. «Смета на строительство, реконструкцию, капитальный ремонт, снос объекта капитального строительства»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
  { sectionCode: "10", designation: "", sectionName: "Раздел 10. «Иная документация в случаях, предусмотренных законодательными и иными нормативными правовыми актами Российской Федерации»", startDate: "", plannedEndDate: "", executor: "", actualEndDate: "", notes: "", level: 0 },
];

export type TemplateKey = 'ird' | 'projectDocumentation' | 'workDocumentation' | 'masterPlan' | 'contract' | 'block6Linear';

export const projectTemplates: Record<TemplateKey, { name: string; sections: Omit<ProjectSection, 'id'>[] }> = {
  ird: {
    name: "Сбор исходно-разрешительных данных (ИРД)",
    sections: irdTemplate,
  },
  projectDocumentation: {
    name: "ОСНОВНОЙ ЭТАП Проектной документации",
    sections: projectDocumentationTemplate,
  },
  workDocumentation: {
    name: "ОСНОВНОЙ ЭТАП Рабочей документации",
    sections: workDocumentationTemplate,
  },
  masterPlan: {
    name: "Мастер План",
    sections: masterPlanTemplate,
  },
  contract: {
    name: "Договор",
    sections: contractTemplate,
  },
  block6Linear: {
    name: "Блок 6: Проектная документация на линейные объекты",
    sections: block6LinearTemplate,
  },
};

