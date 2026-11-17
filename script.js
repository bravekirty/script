/* =========================================================================
 * Автоматическое выставление оценок в журнале МЭШ
 * Запускать в консоли браузера на странице журнала
 * ========================================================================= */
(async function autoGrade() {

  /* -----------------------------------------------------------------------
   * 1. ВХОДНЫЕ ДАННЫЕ
   *    Ключ  — ФИО ученика (как в журнале, точно).
   *    Значение — список [оценка, тип_работы].
   *    Оценка: "5", "4", "3", "2", "б", "н"
   *    Тип:    "ДП", "КР", "СР", "ЛР", "ПР", "КТП", "итог"
   * --------------------------------------------------------------------- */
  const gradesMap = {
    "Антонова Ангелина":    [["5","ДП"], ["4","ДП"], ["5","КР"], ["б","ДП"]],
    "Багаутдинова Арина":   [["4","ДП"], ["3","ДП"]],
    "Баулин Лука":          [["5","ДП"], ["5","ПР"]],
    "Глушкова Татьяна":     [["3","СР"], ["4","ЛР"], ["2","ДП"]],
    "Грибов Михаил":        [["5","ДП"]],
    "Долгих Виктор":        [["4","ДП"], ["4","КР"]],
    "Закутный Илья":        [["н","ДП"]],
    "Кашапов Радмир":       [["5","ДП"], ["б","ДП"], ["5","итог"]],
    "Ковалева Анастасия":   [["4","ДП"]],
    "Кольцов Григорий":     [["5","ДП"], ["4","ПР"]],
    "Конякина Татьяна":     [["5","ДП"], ["5","КТП"]],
    "Лучаев Ефим":          [["3","ДП"]],
    "Макарова Мария":       [["5","ЛР"]],
    "Новоселов Герман":     [["4","ДП"], ["4","СР"]],
    "Парамонова Валерия":   [["5","ДП"]],
    "Плужник Анастасия":    [["б","ДП"], ["4","ДП"]],
    "Рахматулин Данил":     [["2","ДП"]],
    "Рогацкая Кира":        [["5","ДП"], ["5","ДП"], ["5","итог"]],
    "Рыжова Виктория":      [["4","ПР"]],
    "Сардарь Надежда":      [["3","ДП"]],
    "Серёжин Артемий":      [["5","КР"]],
    "Спиридонова Вероника": [["4","ДП"], ["5","ЛР"]],
    "Тарасов Кирилл":       [["5","ДП"], ["5","ДП"]],
    "Федоровская София":    [["4","ДП"]],
    "Юмагужина Алисса":     [["5","ДП"]]
  };

  /* -----------------------------------------------------------------------
   * 2. НАСТРОЙКИ ЗАДЕРЖЕК (мс). Имитируем человека.
   * --------------------------------------------------------------------- */
  const DELAY = {
    openPopup:   [250, 550],   // клик по ячейке → открылся попап
    selectType:  [180, 380],   // выбор типа работы
    selectGrade: [200, 450],   // выбор оценки
    save:        [300, 700],   // пауза перед сохранением
    afterSave:   [150, 350],   // между ячейками
    afterRow:    [600, 1200]   // между учениками
  };

  /* -----------------------------------------------------------------------
   * 3. УТИЛИТЫ
   * --------------------------------------------------------------------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand = ([a, b]) => Math.floor(Math.random() * (b - a + 1)) + a;
  const wait = key => sleep(rand(DELAY[key]));
  const log = (...a) => console.log("%c[AutoGrade]", "color:#0b57d0;font-weight:700", ...a);
  const warn = (...a) => console.warn("[AutoGrade]", ...a);
  const err  = (...a) => console.error("[AutoGrade]", ...a);

  // Ожидание появления элемента в DOM
  function waitFor(selectorOrFn, timeout = 4000, interval = 60) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        let el = typeof selectorOrFn === "function"
          ? selectorOrFn()
          : document.querySelector(selectorOrFn);
        if (el) return resolve(el);
        if (Date.now() - start > timeout) return reject(new Error("Timeout waiting for " + selectorOrFn));
        setTimeout(tick, interval);
      };
      tick();
    });
  }

  /* -----------------------------------------------------------------------
   * 4. ПОИСК ЯЧЕЕК ПО УЧЕНИКУ
   * --------------------------------------------------------------------- */
  function getStudentCells(studentName) {
    return Array.from(
      document.querySelectorAll(`td.mark-cell[data-student="${studentName}"]`)
    ).sort((a, b) => {
      // сортировка: сначала по теме, потом по столбцу
      const ta = +a.dataset.topicIdx, tb = +b.dataset.topicIdx;
      if (ta !== tb) return ta - tb;
      return +a.dataset.col - +b.dataset.col;
    });
  }

  /* -----------------------------------------------------------------------
   * 5. ОБРАБОТКА ОДНОЙ ЯЧЕЙКИ
   * --------------------------------------------------------------------- */
  async function processCell(cell, grade, type) {
    // --- клик по ячейке ---
    cell.scrollIntoView({ block: "center", behavior: "smooth" });
    await sleep(120);
    cell.click();
    await wait("openPopup");

    // --- ждём попап ---
    const popup = await waitFor("#grade-popup.open", 2000);
    if (!popup) throw new Error("Попап не открылся");

    // --- выбор типа работы ---
    const typeBtn = popup.querySelector(`.type-opt[data-type="${type}"]`);
    if (!typeBtn) throw new Error(`Не найден тип работы "${type}"`);
    typeBtn.click();
    await wait("selectType");

    // --- выбор оценки ---
    const gradeBtn = popup.querySelector(`.grade-opt[data-grade="${grade}"]`);
    if (!gradeBtn) throw new Error(`Не найдена оценка "${grade}"`);
    gradeBtn.click();
    await wait("selectGrade");

    // --- сохранить ---
    const saveBtn = document.getElementById("popup-save");
    if (!saveBtn) throw new Error("Кнопка «Сохранить» не найдена");
    await wait("save");
    saveBtn.click();

    // --- убедиться, что попап закрылся ---
    await sleep(150);
    if (document.getElementById("grade-popup").classList.contains("open")) {
      document.getElementById("popup-close").click();
    }
    await wait("afterSave");

    return true;
  }

  /* -----------------------------------------------------------------------
   * 6. ОСНОВНОЙ ЦИКЛ
   * --------------------------------------------------------------------- */
  log("Старт. Всего учеников:", Object.keys(gradesMap).length);

  let total = 0, ok = 0, failed = 0;
  const errors = [];

  for (const [student, marks] of Object.entries(gradesMap)) {
    log(`→ ${student} (${marks.length} оценок)`);

    const cells = getStudentCells(student);
    if (cells.length === 0) {
      warn(`  ячейки не найдены для "${student}"`);
      failed += marks.length;
      continue;
    }
    if (cells.length < marks.length) {
      warn(`  у "${student}" только ${cells.length} ячеек, нужно ${marks.length}`);
    }

    for (let i = 0; i < marks.length && i < cells.length; i++) {
      const [grade, type] = marks[i];
      total++;
      try {
        await processCell(cells[i], grade, type);
        ok++;
        log(`  ✓ ${grade}/${type} → ячейка #${i + 1} (тема ${cells[i].dataset.topicIdx}, кол. ${cells[i].dataset.col})`);
      } catch (e) {
        failed++;
        errors.push({ student, index: i, grade, type, error: e.message });
        err(`  ✗ ${student} [${i}]: ${e.message}`);
      }
    }

    await wait("afterRow");
  }

  /* -----------------------------------------------------------------------
   * 7. ИТОГИ
   * --------------------------------------------------------------------- */
  log("═══════════════════════════════");
  log(`Всего:  ${total}`);
  log(`Успешно: ${ok}`);
  log(`Ошибок: ${failed}`);
  if (errors.length) {
    log("Список ошибок:");
    console.table(errors);
  }
  log("═══════════════════════════════");

  return { total, ok, failed, errors };
})();