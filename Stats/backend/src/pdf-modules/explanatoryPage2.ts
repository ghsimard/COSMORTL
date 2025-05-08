import { CustomPDFKit, addHeader } from './pdfUtils';

// Function to create the second explanatory page with convivencia content
export const generateExplanatoryPage2 = (doc: CustomPDFKit): void => {
  // Add a new page with header
  doc.addPage();
  addHeader(doc);

  // Define margins and text width
  const startX = 75;  // Further reduced margin
  const textWidth = doc.page.width - (startX * 2);  // Wider text width
  const startY = doc.y + 15;  // Minimal space after header

  // Reset cursor position
  doc.x = startX;
  doc.y = startY;

  // Start convivencia section with consistent formatting
  doc.fontSize(10)
     .font('Helvetica')
     .text('La ', {
       continued: true,
       align: 'justify',
       width: textWidth,
       indent: 0,
       lineGap: 0.5
     })
     .font('Helvetica-Bold')
     .text('convivencia ', {
       continued: true
     })
     .font('Helvetica')
     .text(' se entiende con el conjunto de relaciones que se construyen por el afecto, las emociones, los deseos y los sueños de quienes componen una comunidad. En ellas se promueven y vivencian los derechos humanos, la igualdad en el trato, el reconocimiento y el respeto por las diferencias para la construcción del tejido social. La convivencia escolar es un aprendizaje permanente que orienta a los sujetos a "aprender a vivir juntos" y pasa por el deber que tiene la institución educativa de garantizar el respeto a los derechos humanos. Comprendiendo la condición humana diversa, este aprendizaje pasa por asumir la diferencia como posibilidad de aprendizaje entre pares y el conflicto como una constante en las relaciones humanas que están en la base de la construcción de ciudadanía. La autonomía y la ética del cuidado son elementos formativos fundamentales para la convivencia escolar (Rectores Líderes Transformadores, 2017b) (2). En relación con el ambiente escolar, el trato respetuoso y solidario con las otras y los otros, la construcción de acuerdos colectivos para convivir, la comprensión de la diferencia como potencia y no como déficit, el sentirse escuchado y comprendido y el tener herramientas disponibles para actuar frente a los conflictos impacta la manera como interactuamos a diario y la comprensión que tenemos sobre el mundo.', {
       align: 'justify',
       width: textWidth,
       indent: 0,
       lineGap: 0.5
     })
     .moveDown(0.5);

  // Add remaining paragraphs with consistent tight spacing
  doc.text('Conocer la percepción sobre el ambiente escolar le permite al directivo evidenciar los aspectos que su comunidad educativa resalta como fortalezas y como oportunidades de mejora desde su vivencia en el aula de clase y como producto de sus interacciones. Esta información de "primera mano" es muy valiosa para el directivo pues puede, de manera articulada con las actividades propuestas por el Programa, emprender acciones oportunas para superar dificultades que se presentan en la IE. Esta información debe ser compartida con la comunidad educativa y con ellos analizar estos resultados para poder identificar acciones o un plan de acción para superar los retos identificados. De esta manera, se asegura que quien participa en la encuesta pueda conocer los resultados y emprender procesos de corresponsabilidad.', {
       align: 'justify',
       width: textWidth,
       indent: 0,
       lineGap: 0.5
     })
     .moveDown(0.5);

  doc.text('Estos resultados son una herramienta para identificar retos y oportunidades de mejora en el ambiente escolar de la institución educativa que lidera y no constituyen una medición directa sobre el ambiente escolar. Es decir, los resultados presentados muestran la percepción de un grupo no representativo de actores indicando los aspectos que este grupo resalta en relación a las prácticas pedagógicas, la convivencia y la comunicación.', {
       align: 'justify',
       width: textWidth,
       indent: 0,
       lineGap: 0.5
     })
     .moveDown(0.5);

  doc.text('El informe se divide en tres partes. En la primera se encuentra la información general del directivo y de las personas encuestadas. La segunda es un resumen general de la percepción del ambiente que tiene cada uno de los grupos de actores en los tres componentes evaluados (comunicación, prácticas pedagógicas y convivencia). Al final está un resumen de las respuestas de cada uno de los ítems de la encuesta y un espacio para que el directivo escriba los retos que este informe le plantea.', {
       align: 'justify',
       width: textWidth,
       indent: 0,
       lineGap: 0.5
     })
     .moveDown(20);

  // Add references with minimal spacing
  doc.fontSize(7.5)  // Even smaller font for references
     .font('Helvetica-Oblique')
     .text('(2) Programa Rectores Líderes Transformadores (2017b). Cartilla del módulo 2: Gestión pedagógica. Bogotá: Fundación Empresarios por la Educación.', {
       align: 'left',
       width: textWidth,
       indent: 0,
       lineGap: 0.25
     });
}; 